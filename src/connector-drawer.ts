import type { Part } from '@stringsync/mdom';
import {
	type RenderContext,
	type Stave,
	StaveConnector,
	type StaveConnectorType,
} from 'vexflow';
import {
	BRACE_LEFT_OVERHANG,
	BRACKET_GLYPH_OVERHANG,
	BRACKET_X_SHIFT,
	CONNECTOR_VERTICAL_OVERHANG,
	LABEL_FONT_SIZE,
	LABEL_GAP,
	PART_GROUP_STEP,
} from './constants';
import type { PartGroup, ScoreReader } from './score-reader';
import type { StavePlan } from './stave-plan';

/*
 * The stroke pattern of each <bar-style> vexflow has no type for, as [offset, width] pairs
 * measured from the barline's x — the same geometry vexflow's own Barline uses, where a thin
 * bar is 1px at x and a thick one is 3px at x-2, so a custom style sits flush with the plain
 * dividers around it. `dash` turns the stroke into a broken line ([on, off] lengths).
 *
 * 'tick' and 'short' are the abbreviated dividers: both are single thin strokes that cover
 * only part of the stave height, so they carry a `span` in staff-space units measured down
 * from the top line — a tick straddles the top line, a short one fills the middle two spaces.
 */
const CUSTOM_BAR_STYLES: Record<
	string,
	{
		bars: Array<[offset: number, width: number]>;
		dash?: [number, number];
		span?: [from: number, to: number];
	}
> = {
	dotted: { bars: [[0, 1]], dash: [1, 3] },
	dashed: { bars: [[0, 1]], dash: [4, 4] },
	heavy: { bars: [[-2, 3]] },
	'heavy-light': {
		bars: [
			[-5, 3],
			[0, 1],
		],
	},
	'heavy-heavy': {
		bars: [
			[-6, 3],
			[-2, 3],
		],
	},
	tick: { bars: [[0, 1]], span: [-0.5, 0.5] },
	short: { bars: [[0, 1]], span: [1, 3] },
};

/*
 * One measure column's connector inputs, snapshotted from the measure loop at each call:
 * where the column sits, the system staves it spans, and the repeat/bar-style state
 * resolved for its measure.
 */
export interface ConnectorColumn {
	/** Left edge of the measure column. */
	measureX: number;
	systemIndex: number;
	isSystemStart: boolean;
	/** Whether this is the last measure DRAWN (it closes with the thin-thick end line). */
	isLastMeasure: boolean;
	/** The measure's right <bar-style>, or null when it declares none. */
	barStyle: string | null;
	/** Whether the measure closes with a backward repeat. */
	repeatEnd: boolean;
	/** Whether that repeat butts against the next measure's forward repeat on the same
	 * line, printing as one back-to-back sign. */
	repeatBoth: boolean;
	/** Where the column's opening repeat sign sits once aligned across its staves, or null
	 * when there is no such sign. */
	begRepeatX: number | null;
	/** The system's top and bottom staves at this column; undefined until a stave exists. */
	systemTop: Stave | undefined;
	systemBottom: Stave | undefined;
	/** This column's top/bottom stave per part index, so a <part-group> connector can span
	 * from one part's top stave to another's bottom. Sparse: a part with no measure here
	 * has no entry. */
	partStaves: ReadonlyArray<{ top: Stave; bottom: Stave } | undefined>;
}

export interface ConnectorDrawerOptions {
	/** The score's parts, in render order. */
	parts: Part[];
	/** The <part-group> spans from the <part-list>, outermost first. Fixed for the score. */
	partGroups: PartGroup[];
	/** Part boundaries a barline must not run across (<group-barline>no</group-barline>).
	 * Empty for every score that doesn't ask, which is nearly all of them. */
	barlineBreaks: ReadonlySet<number>;
	/** Which kinds of stave the render shows, forwarded to every reader query so the
	 * connectors agree with the stave rows actually drawn. */
	totalStaves: number;
	/** The first system's reserved left indents (see ScoreLayout): the whole label column,
	 * and the inner band the part labels print in — group names go outside that. */
	labelIndent: number;
	partLabelIndent: number;
	labelFont: string;
	notationColor: string;
	textColor: string;
}

/*
 * Draws the vertical furniture joining a system's staves: the bracket and <part-group>
 * connectors (with their group names) at a system start, the barline runs tying each
 * measure's end line across parts, and the repeat/custom barlines vexflow has no
 * connector or Barline type for. One instance lives and dies with its DrawPass.
 */
export class ConnectorDrawer {
	private readonly parts: Part[];
	private readonly partGroups: PartGroup[];
	private readonly barlineBreaks: ReadonlySet<number>;
	private readonly totalStaves: number;
	private readonly labelIndent: number;
	private readonly partLabelIndent: number;
	private readonly labelFont: string;
	private readonly notationColor: string;
	private readonly textColor: string;

	constructor(
		private readonly context: RenderContext,
		readonly _reader: ScoreReader,
		private readonly staves: StavePlan,
		opts: ConnectorDrawerOptions,
	) {
		this.parts = opts.parts;
		this.partGroups = opts.partGroups;
		this.barlineBreaks = opts.barlineBreaks;
		this.totalStaves = opts.totalStaves;
		this.labelIndent = opts.labelIndent;
		this.partLabelIndent = opts.partLabelIndent;
		this.labelFont = opts.labelFont;
		this.notationColor = opts.notationColor;
		this.textColor = opts.textColor;
	}

	/*
	 * Join the whole system across all parts with a shared left line at the
	 * system start, and a closing line at the system end.
	 */
	drawConnectors(column: ConnectorColumn): void {
		const { systemTop, systemBottom } = column;
		if (systemTop && systemBottom && this.totalStaves > 1) {
			if (column.isSystemStart) {
				// Every multi-stave system gets a plain left line closing the staves' left
				// edge. A notation+tab pair split across separate parts also gets a bracket
				// (the cross-part analog of the single-part bracket), drawn just outside it.
				new StaveConnector(systemTop, systemBottom)
					.setType('singleLeft')
					.setContext(this.context)
					.draw();
				if (this.staves.partsPairTabWithNotation(this.parts)) {
					// The bracket's x comes entirely from its top stave; nudge that 4px left
					// so the bracket sits just outside the system line with a small gap, then
					// restore.
					systemTop.setX(column.measureX - BRACKET_X_SHIFT);
					new StaveConnector(systemTop, systemBottom)
						.setType('bracket')
						.setContext(this.context)
						.draw();
					systemTop.setX(column.measureX);
				}
				this.drawPartGroupConnectors(column);
				this.drawPartGroupNames(column);
			}
			// A repeat's bars run the full height of the system like any other barline, but its
			// dots belong to each stave — and no connector type draws dots. So each stave draws
			// the whole sign itself and a bold-double connector retraces just the bars: vexflow
			// gives it the same geometry it gives a repeat barline, so it lands exactly over the
			// per-stave bars and fills the gaps between staves.
			if (column.begRepeatX !== null) {
				this.drawRepeatConnector(
					column,
					'boldDoubleLeft',
					column.begRepeatX - systemTop.getX(),
				);
			}
			// Every measure's end line gets a connector joining the part's staves, so
			// internal barlines are tied across staves and not just drawn per-stave.
			// The piece's final measure gets a bold thin-thick connector to match its
			// end barline; all other measure ends get a plain single line.
			if (column.repeatEnd) {
				this.drawRepeatConnector(column, 'boldDoubleRight');
				// A back-to-back sign closes and reopens on the same line: the reopening half
				// sits at the same x, so its connector shifts out to the measure's right edge.
				if (column.repeatBoth) {
					this.drawRepeatConnector(
						column,
						'boldDoubleLeft',
						systemTop.getWidth(),
					);
				}
				return;
			}
			// ponytail: on a MULTI-stave system only light-light and light-heavy change the
			// connector — StaveConnector's own vocabulary is thin / thinDouble / boldDoubleRight,
			// with no dotted, dashed or heavy member, so the exotic styles fall back to the plain
			// line there. Single-stave scores (where these styles actually show up) get the full
			// vocabulary via drawCustomBarline; widen this if a multi-stave fixture needs it.
			let type: StaveConnectorType = 'singleRight';
			if (column.barStyle === 'light-light') {
				type = 'thinDouble';
			} else if (column.barStyle === 'light-heavy' || column.isLastMeasure) {
				type = 'boldDoubleRight';
			}
			for (const run of this.barlineRuns(column)) {
				new StaveConnector(run.top, run.bottom)
					.setType(type)
					.setContext(this.context)
					.draw();
			}
		}
	}

	/*
	 * The vertical runs a measure's barline connector is drawn in — one per unbroken stretch of
	 * parts (see barlineBreaks), which by default means one run per part. A run always spans
	 * whole parts: a part's own staves are joined by its barline, which is what the brace on a
	 * grand staff means. An ungrouped single-part system has no breaks and yields one run.
	 */
	barlineRuns(column: ConnectorColumn): Array<{ top: Stave; bottom: Stave }> {
		const systemTop = column.systemTop;
		const systemBottom = column.systemBottom;
		if (!systemTop || !systemBottom) {
			return [];
		}
		if (this.barlineBreaks.size === 0) {
			return [{ top: systemTop, bottom: systemBottom }];
		}
		const runs: Array<{ top: Stave; bottom: Stave }> = [];
		let top: Stave | undefined;
		let bottom: Stave | undefined;
		for (const [partIndex, staves] of column.partStaves.entries()) {
			// A part with no measure in this column has no staves; it can't close a run, and
			// leaving the open one running past it matches what the single-connector path did.
			if (staves) {
				top ??= staves.top;
				bottom = staves.bottom;
			}
			if (this.barlineBreaks.has(partIndex) && top && bottom) {
				runs.push({ top, bottom });
				top = undefined;
				bottom = undefined;
			}
		}
		if (top && bottom) {
			runs.push({ top, bottom });
		}
		// A run of one stave draws nothing useful (a connector needs two), but the stave's own
		// end barline already covers it — so the empty case is correct, not a gap.
		return runs;
	}

	/*
	 * Paint this measure's end barline for the <bar-style> values vexflow has no Barline type
	 * for (see CUSTOM_BAR_STYLES). buildStave left the stave's end bar as NONE for these, so
	 * this is the only line drawn there, laid down right after the stave so it sits under the
	 * notes like any other barline. A repeat sign at the same edge wins and is already drawn,
	 * so it suppresses this.
	 */
	drawCustomBarline(stave: Stave, column: ConnectorColumn): void {
		if (column.repeatEnd || column.repeatBoth || !column.barStyle) {
			return;
		}
		this.paintBarStyle(stave, stave.getX() + stave.getWidth(), column.barStyle);
	}

	/* Paint one <bar-style> vexflow has no Barline type for, as a vertical stroke at `x` on
	 * `stave` (see CUSTOM_BAR_STYLES). A style vexflow does draw is a no-op here — it was
	 * already drawn with the stave, or with the mid-measure BarNote standing in its place. */
	paintBarStyle(stave: Stave, x: number, barStyle: string): void {
		const style = CUSTOM_BAR_STYLES[barStyle];
		if (!style) {
			return;
		}
		const spacing = stave.getSpacingBetweenLines();
		const topY = stave.getTopLineTopY();
		// A `span` is measured in staff spaces down from the top line; without one the bar
		// runs the full stave height, the way every vexflow barline does.
		const [from, to] = style.span ?? [0, 0];
		const y = style.span ? topY + from * spacing : topY;
		const height = style.span
			? (to - from) * spacing
			: stave.getBottomLineBottomY() - topY;
		this.context.save();
		this.context.setFillStyle(this.notationColor);
		for (const [offset, width] of style.bars) {
			if (style.dash) {
				// fillRect can't dash, so walk the stroke in [on, off] runs. The last run is
				// clipped to the bar's height rather than overshooting past the bottom line.
				const [on, off] = style.dash;
				for (let dy = 0; dy < height; dy += on + off) {
					this.context.fillRect(
						x + offset,
						y + dy,
						width,
						Math.min(on, height - dy),
					);
				}
			} else {
				this.context.fillRect(x + offset, y, width, height);
			}
		}
		this.context.restore();
	}

	/*
	 * The extent of the stave connector drawn at a system start (a bracket or brace joining a
	 * part's staves, or a notation+tab pair across parts), so the system-start measure box can
	 * grow to contain it. vexflow draws a bracket just left of the stave (BRACKET_X_SHIFT),
	 * insetting its bar/curl glyphs a little further and overhanging the curls past the top and
	 * bottom staff lines; a brace reaches further left but stays within the staff lines
	 * vertically. Returns null away from a system start, or when the only connector is the plain
	 * left line (which sits on measureX — already the box's left edge).
	 */
	connectorExtent(column: ConnectorColumn): {
		left: number;
		top: number;
		bottom: number;
	} | null {
		if (!column.isSystemStart || !column.systemTop || !column.systemBottom) {
			return null;
		}
		let bracket = this.staves.partsPairTabWithNotation(this.parts);
		let brace = false;
		for (const part of this.parts) {
			if (this.staves.visibleNumbers(part).length <= 1) {
				continue;
			}
			const symbol = this.staves.symbolOf(part);
			bracket ||= symbol === 'bracket';
			brace ||= symbol === 'brace';
		}
		const top = column.systemTop.getYForLine(0);
		const bottom = column.systemBottom.getBottomLineY();
		if (bracket) {
			return {
				left: column.measureX - BRACKET_X_SHIFT - BRACKET_GLYPH_OVERHANG,
				top: top - CONNECTOR_VERTICAL_OVERHANG,
				bottom: bottom + CONNECTOR_VERTICAL_OVERHANG,
			};
		}
		if (brace) {
			return { left: column.measureX - BRACE_LEFT_OVERHANG, top, bottom };
		}
		return null;
	}

	/*
	 * Draw the `<part-group>` symbols at a system start: one connector per group, from its
	 * first member part's top stave down to its last member's bottom stave. Nested groups
	 * step further left of the system so an inner symbol doesn't print over its outer one —
	 * the same "the connector's x comes from its top stave" nudge the notation+tab bracket
	 * uses, just repeated per depth.
	 *
	 * The nudge is restored right after each draw, so nothing downstream sees a moved stave.
	 */
	private drawPartGroupConnectors(column: ConnectorColumn): void {
		const maxDepth = Math.max(0, ...this.partGroups.map((g) => g.depth));
		for (const group of this.partGroups) {
			const top = column.partStaves[group.fromPart]?.top;
			const bottom = column.partStaves[group.toPart]?.bottom;
			if (!top || !bottom) {
				continue;
			}
			// The innermost group hugs the system; each level out steps further left. Depth
			// counts inward, so invert it.
			top.setX(
				column.measureX -
					BRACKET_X_SHIFT -
					PART_GROUP_STEP * (maxDepth - group.depth),
			);
			new StaveConnector(top, bottom)
				.setType(group.symbol === 'line' ? 'singleLeft' : group.symbol)
				.setContext(this.context)
				.draw();
			top.setX(column.measureX);
		}
	}

	/*
	 * Print each `<part-group>`'s `<group-name>` at the first system's start, in the column of
	 * the left indent that sits OUTSIDE the part labels (see ScoreLayout.partLabelIndent) and
	 * vertically centered on the parts the group spans — the section heading a bracket in an
	 * orchestral score carries ("Oboe through Clarinet" over its three staves).
	 *
	 * Right-aligned like the part labels, so with several groups every name ends at the same x.
	 * Only drawn with showPartLabels on; the indent it needs is only reserved then.
	 */
	private drawPartGroupNames(column: ConnectorColumn): void {
		if (column.systemIndex !== 0 || this.labelIndent <= this.partLabelIndent) {
			return;
		}
		this.context.save();
		this.context.setFont(this.labelFont, LABEL_FONT_SIZE);
		this.context.setFillStyle(this.textColor);
		for (const group of this.partGroups) {
			const top = column.partStaves[group.fromPart]?.top;
			const bottom = column.partStaves[group.toPart]?.bottom;
			if (!group.name || !top || !bottom) {
				continue;
			}
			const width = this.context.measureText(group.name).width;
			// Centered on the staff lines the group spans, the same measure (and the same
			// +1.5 baseline nudge) a part label uses.
			const cy = (top.getYForLine(0) + bottom.getBottomLineY()) / 2;
			this.context.fillText(
				group.name,
				column.measureX - this.partLabelIndent - LABEL_GAP - width,
				cy + 1.5,
			);
		}
		this.context.restore();
	}

	/* One half of a repeat sign carried down the system. `xShift` moves a left-sided connector
	 * off the stave's left edge — an opening repeat prints after the clef and signatures, and a
	 * back-to-back one prints at the measure's right edge. */
	private drawRepeatConnector(
		column: ConnectorColumn,
		type: 'boldDoubleLeft' | 'boldDoubleRight',
		xShift = 0,
	): void {
		if (!column.systemTop || !column.systemBottom) {
			return;
		}
		new StaveConnector(column.systemTop, column.systemBottom)
			.setType(type)
			.setXShift(xShift)
			.setContext(this.context)
			.draw();
	}
}
