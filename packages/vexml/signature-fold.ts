import type { Measure, Part, Score } from '@stringsync/mdom';
import { Barline, CanvasContext, type Stave } from 'vexflow';
import { ConnectorDrawer } from './connector-drawer';
import { FOLD_PADDING, PAGE_MARGIN_X } from './constants';
import type { Fold } from './fold';
import type { MeasureBox } from './layout-planner';
import type { ScoreReader } from './score-reader';
import type { SignatureTranslator } from './signature-translator';
import { StaveFactory } from './stave-factory';
import type { StavePlan } from './stave-plan';

export interface SignatureFoldOptions {
	/** The laid-out measure boxes; the fold follows the first system (a panorama's only one). */
	boxes: ReadonlyArray<MeasureBox | undefined>;
	/** Each stave row's final score-space y, as the draw pass placed it. */
	rowYs: readonly number[];
	totalStaves: number;
	/** The engraving's final score-space height. */
	height: number;
	notationColor: string;
	textColor: string;
}

/* One stretch of the score whose staves all open with the same clefs and keys: it starts at
 * `x`, the left edge of `measureIndex`, and its strip is engraved from that measure. */
type FoldState = { x: number; measureIndex: number };

/* A strip's staves, built but not drawn, with each part's top and bottom stave for the
 * connectors that join them. */
type FoldColumn = {
	staves: Stave[];
	partStaves: Array<{ part: Part; top: Stave; bottom: Stave } | undefined>;
};

/*
 * Engraves the strips a sticky panoramic score pins at its left edge. The score is split
 * wherever a clef or key changes at a measure start, and each stretch gets its own strip:
 * the stave lines, the brace/bracket and part-group connectors, and every stave's clef and
 * key as in effect there. A change stated mid-measure shows from the next barline.
 *
 * Strips are painted on demand from the laid-out stave positions rather than kept as
 * bitmaps, so a score full of changes costs no more memory than one without.
 */
export class SignatureFold implements Fold {
	readonly left: number;
	readonly width: number;
	readonly height: number;
	private readonly parts: Part[];
	private readonly states: FoldState[] = [];
	private readonly factory: StaveFactory;
	private readonly systemX: number;

	constructor(
		signatures: SignatureTranslator,
		private readonly reader: ScoreReader,
		private readonly staves: StavePlan,
		private readonly score: Score,
		private readonly opts: SignatureFoldOptions,
	) {
		this.factory = new StaveFactory(signatures, staves);
		this.parts = score.parts;
		this.height = opts.height;
		this.systemX = opts.boxes.find((box) => box !== undefined)?.x ?? 0;
		// The page margin stays in: it's where a brace or bracket reaches left of the staves.
		this.left = Math.max(0, this.systemX - PAGE_MARGIN_X);
		let previous: string | null = null;
		for (const [measureIndex, box] of opts.boxes.entries()) {
			if (box?.systemIndex !== 0) {
				continue;
			}
			const signature = this.signatureAt(measureIndex);
			if (signature !== previous) {
				this.states.push({ x: box.x, measureIndex });
				previous = signature;
			}
		}
		// Wide enough for the widest opening, so the fold holds still as keys change under it.
		let right = this.systemX;
		for (const state of this.states) {
			for (const stave of this.column(state, 0).staves) {
				right = Math.max(right, stave.getNoteStartX());
			}
		}
		this.width = right + FOLD_PADDING - this.left;
	}

	indexAt(x: number): number {
		let index = 0;
		for (const [i, state] of this.states.entries()) {
			if (state.x > x) {
				break;
			}
			index = i;
		}
		return index;
	}

	paint(context2D: CanvasRenderingContext2D, index: number): void {
		const state = this.states[index];
		if (!state) {
			return;
		}
		const context = new CanvasContext(context2D);
		context.setFillStyle(this.opts.notationColor);
		context.setStrokeStyle(this.opts.notationColor);
		// The staff lines run on past the strip's edge, which clips them; a stave that stopped
		// short would leave a gap at the fold.
		const column = this.column(
			state,
			this.left + this.width - this.systemX + 1,
		);
		for (const stave of column.staves) {
			stave.setContext(context).draw();
		}
		// No label column: part and group names stay on the page, not the fold.
		const connectors = new ConnectorDrawer(context, this.reader, this.staves, {
			parts: this.parts,
			partGroups: this.reader.partGroups(this.score),
			barlineBreaks: new Set(),
			totalStaves: this.opts.totalStaves,
			labelIndent: 0,
			partLabelIndent: 0,
			labelFont: '',
			notationColor: this.opts.notationColor,
			textColor: this.opts.textColor,
		});
		const partStaves = column.partStaves.map((entry) =>
			entry ? { top: entry.top, bottom: entry.bottom } : undefined,
		);
		for (const entry of column.partStaves) {
			if (entry) {
				connectors.drawPartSymbol(
					entry.part,
					entry.top,
					entry.bottom,
					this.systemX,
				);
			}
		}
		connectors.drawSystemStart({
			measureX: this.systemX,
			systemIndex: 0,
			isSystemStart: true,
			isLastMeasure: false,
			barStyle: null,
			repeatEnd: false,
			repeatBoth: false,
			begRepeatX: null,
			systemTop: column.staves[0],
			systemBottom: column.staves.at(-1),
			partStaves,
		});
	}

	/* Every rendered stave's clef and key at a measure start, as one comparable string. */
	private signatureAt(measureIndex: number): string {
		const parts: string[] = [];
		for (const part of this.parts) {
			const measure = part.measures[measureIndex];
			for (const staffNumber of this.staves.visibleNumbers(part)) {
				if (!measure || this.staves.isTab(part, staffNumber)) {
					parts.push('');
					continue;
				}
				const clef = this.factory.clefSpec(measure, staffNumber);
				const key = this.reader.keyIdentity(measure.getKey(staffNumber));
				parts.push(`${clef}/${key}`);
			}
		}
		return parts.join(';');
	}

	/* The strip's staves for `state`, `width` wide, each at its row's y and opening with the
	 * clef and key in effect at the state's measure. */
	private column(state: FoldState, width: number): FoldColumn {
		const staves: Stave[] = [];
		const partStaves: FoldColumn['partStaves'] = [];
		let row = 0;
		for (const part of this.parts) {
			const numbers = this.staves.visibleNumbers(part);
			const measure: Measure | undefined = part.measures[state.measureIndex];
			if (!measure) {
				row += numbers.length;
				partStaves.push(undefined);
				continue;
			}
			const built: Stave[] = [];
			for (const staffNumber of numbers) {
				const placed = this.factory.create(
					part,
					measure,
					staffNumber,
					this.systemX,
					this.opts.rowYs[row] ?? 0,
					width,
				);
				// Only a lone TAB stave closes its own left edge; everything else is closed by
				// the system's connector line, as at the real system start.
				placed.stave.setBegBarType(
					placed.isTab && this.opts.totalStaves === 1
						? Barline.type.SINGLE
						: Barline.type.NONE,
				);
				placed.stave.setEndBarType(Barline.type.NONE);
				this.factory.addOpening(placed, measure, staffNumber);
				built.push(placed.stave);
				row++;
			}
			const top = built[0];
			const bottom = built.at(-1);
			partStaves.push(top && bottom ? { part, top, bottom } : undefined);
			staves.push(...built);
		}
		return { staves, partStaves };
	}
}
