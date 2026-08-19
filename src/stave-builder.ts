import type { Measure, Part } from '@stringsync/mdom';
import {
	Barline,
	MultiMeasureRest,
	type RenderContext,
	Stave,
	StaveModifierPosition,
	TabStave,
} from 'vexflow';
import { Rect } from 'webappwiz/geometry';
import { BAR_STYLE_TYPES, type BarlineDecoration } from './barline-translator';
import type { CollisionResolver } from './collision-resolver';
import type { Gap, MeasureNumbering } from './config';
import {
	MULTI_REST_PADDING,
	VOLTA_LABEL_DROP,
	VOLTA_STAVE_GAP,
} from './constants';
import { CustomKeySignature } from './custom-key-signature';
import type { Gaps } from './gaps';
import type { PartGroup, ScoreReader, StaveVisibility } from './score-reader';
import type { SignatureTranslator } from './signature-translator';
import type { SpillTracker } from './spill-tracker';

/*
 * One measure column's stave inputs, snapshotted from the measure loop at each build:
 * where the column sits, which stave row is being placed, and the barline/repeat state
 * resolved for its measure.
 */
export interface StaveColumn {
	/** 0-based document index of the column's measure. */
	measureIndex: number;
	/** Left edge of the measure column. */
	measureX: number;
	measureWidth: number;
	systemIndex: number;
	/** Top y of the system's stave block; the stave-row offsets measure down from it. */
	systemY: number;
	/** Which stave row (counted over the whole system) this stave lands on. */
	staveRow: number;
	isSystemStart: boolean;
	/** Whether this is the last measure DRAWN (it closes with the thin-thick end line). */
	isLastMeasure: boolean;
	/** The measure's right <bar-style>, or null when it declares none. */
	barStyle: string | null;
	/** The measure's repeat dots and volta bracket. */
	decoration: BarlineDecoration;
	/** Whether the measure's backward repeat butts against the next measure's forward
	 * repeat on the same line, printing as one back-to-back sign. */
	repeatBoth: boolean;
	/** Whether the previous measure's backward repeat already closed this boundary, so
	 * this measure skips its own opening dots. */
	suppressBegRepeat: boolean;
	/** Whether an earlier stave of this column already printed the measure number. */
	measureNumbered: boolean;
	/** The next measure's box when it carries a volta on this same system, or null —
	 * see the early obstacle registration in build. */
	nextVolta: { x: number; width: number } | null;
}

/* What one build hands back for the driver to fold into its column and page state. */
export interface BuiltStave {
	stave: Stave;
	/** Whether the stave is a TabStave (fret numbers; no clef, key or time). */
	isTab: boolean;
	/** The column's volta line ys when this stave carries the bracket (the system's top
	 * stave under an ending), or null: `base` is the unlifted line the lift observations
	 * measure against, `top` where the bracket actually sits. */
	volta: { base: number; top: number } | null;
	/** How many measures the stave's <multiple-rest> consolidates, or null when the
	 * measure draws its own notes. */
	multiRestCount: number | null;
	/** Whether this stave printed the measure number. */
	numbered: boolean;
}

export interface StaveBuilderOptions {
	/** The score's parts, in render order. */
	parts: Part[];
	/** The <part-group> spans from the <part-list>, outermost first. Fixed for the score. */
	partGroups: PartGroup[];
	/** Which kinds of stave the render shows, forwarded to every reader query so the
	 * staves agree with the rows actually drawn. */
	visibility: StaveVisibility;
	totalStaves: number;
	/** When to print measure numbers above the staff. */
	measureNumbering: MeasureNumbering;
	textColor: string;
	/** Stave-row y offsets from the system top (see ScoreLayout.staveOffsets). */
	staveOffsets: number[];
	/** Per-system offset overrides once a first pass has measured spill; undefined on
	 * a first pass. */
	systemStaveOffsets: ReadonlyMap<number, number[]> | undefined;
	/** How far each system's volta brackets rise to clear the notes under them — measured
	 * on the previous pass and reserved on this one; empty on the first pass. */
	voltaLifts: ReadonlyMap<number, number>;
}

/*
 * Builds one measure-column stave at a time: the vexflow Stave/TabStave placed at its
 * row, with its clefs, key and time signatures, begin/end barlines, repeat signs, volta
 * bracket, measure number and tab sizing — plus the consolidated multi-bar rest a
 * <multiple-rest> lead draws over it. The stave comes back unqueued and undrawn: the
 * driver draws the whole column at once so a repeat sign can be aligned across staves
 * that reserve different opening widths. One instance lives and dies with its DrawPass.
 */
export class StaveBuilder {
	private readonly parts: Part[];
	private readonly partGroups: PartGroup[];
	private readonly visibility: StaveVisibility;
	private readonly totalStaves: number;
	private readonly measureNumbering: MeasureNumbering;
	private readonly textColor: string;
	private readonly staveOffsets: number[];
	private readonly systemStaveOffsets:
		| ReadonlyMap<number, number[]>
		| undefined;
	private readonly voltaLifts: ReadonlyMap<number, number>;
	// Document measure index -> the gap spec rendered there (empty when config has none).
	private readonly gaps: ReadonlyMap<number, Gap>;
	// Lead measure index -> the number of measures its <multiple-rest> consolidates.
	private readonly multiRests: ReadonlyMap<number, number>;

	constructor(
		private readonly signatures: SignatureTranslator,
		private readonly reader: ScoreReader,
		private readonly context: RenderContext,
		private readonly collisionResolver: CollisionResolver,
		private readonly spill: SpillTracker,
		gaps: Gaps,
		opts: StaveBuilderOptions,
	) {
		this.parts = opts.parts;
		this.partGroups = opts.partGroups;
		this.visibility = opts.visibility;
		this.totalStaves = opts.totalStaves;
		this.measureNumbering = opts.measureNumbering;
		this.textColor = opts.textColor;
		this.staveOffsets = opts.staveOffsets;
		this.systemStaveOffsets = opts.systemStaveOffsets;
		this.voltaLifts = opts.voltaLifts;
		this.gaps = gaps.byMeasureIndex();
		// <multiple-rest> runs: the lead measure draws the consolidated bar instead of its own
		// notes, and the measures it swallows have no box (the layout planner dropped them), so
		// the measure loop skips them without any extra guard here.
		this.multiRests = this.reader.multiRestsOf(this.parts).leads;
	}

	/**
	 * Whether the measure at 0-based `index` (system-start or not) shows its number under the
	 * configured mode. 'every-N' numbers every Nth measure plus every system start.
	 */
	showsMeasureNumber(index: number, isSystemStart: boolean): boolean {
		switch (this.measureNumbering) {
			case 'none':
				return false;
			case 'system':
				return isSystemStart;
			case 'every':
				return true;
			case 'every-2':
				return isSystemStart || index % 2 === 0;
			case 'every-3':
				return isSystemStart || index % 3 === 0;
		}
	}

	/*
	 * Build the column's stave for the given part-staff: place it at its row, set its
	 * clef/key/time and barlines, and dress it with the repeat, volta and measure-number
	 * furniture. `visibleCount` is how many staves the part renders (tab/notation staves
	 * may be hidden).
	 */
	build(
		part: Part,
		measure: Measure,
		staffNumber: string,
		visibleCount: number,
		column: StaveColumn,
	): BuiltStave {
		const m = column.measureIndex;
		const clef = measure.getClef(staffNumber);
		// Each system gets its own offsets once pass one has measured it (a bar that needs a
		// wide grand-staff gap doesn't spread its neighbours apart); pass one has none yet.
		const offsets =
			this.systemStaveOffsets?.get(column.systemIndex) ?? this.staveOffsets;
		const staveY = column.systemY + (offsets[column.staveRow] ?? 0);

		// A TAB clef draws on a TabStave whose line count matches the
		// instrument's strings (<staff-lines>: 6 for guitar, 4 for bass).
		const isTab = this.reader.isTabStaff(part, staffNumber);
		const tabLines = isTab ? measure.getStaveLines(staffNumber) : 0;
		const staveLines = measure.getStaveLines(staffNumber);
		// Half the lines a reduced stave drops come off the top. The whole part of that says
		// which five-line row it starts on; the leftover half (an even line count can't sit on
		// the five-line rows) nudges the whole frame — lines and note rows together — down a
		// half space, which is how an even-line stave centers.
		const hiddenAbove = Math.max(0, Math.floor((5 - staveLines) / 2));
		const halfNudge = Math.max(0, (5 - staveLines) / 2 - hiddenAbove);
		const stave = isTab
			? new TabStave(column.measureX, staveY, column.measureWidth, {
					numLines: tabLines,
				})
			: new Stave(column.measureX, staveY, column.measureWidth, {
					// A reduced stave keeps the five-line frame and HIDES the lines it doesn't
					// draw, rather than declaring fewer of them. vexflow anchors a shorter stave
					// at the top — its lines come off the bottom, so a 1-line percussion stave
					// draws where a five-line stave's TOP line goes — while leaving note rows,
					// ledger lines, clef and time signature in the five-line frame regardless.
					// Hiding instead centers the drawn lines the way MuseScore and OSMD do (the
					// single line lands on the middle line, with the percussion clef straddling
					// it) and leaves everything measured off the stave — note rows, connectors,
					// part spacing — exactly as it was.
					spaceAboveStaffLn: 4 + halfNudge,
				});
		// Tab is exempt: its line count IS its string count, so a 4-string stave draws four
		// lines and means it.
		for (let line = 0; line < 5 && !isTab && staveLines < 5; line++) {
			stave.setConfigForLine(line, {
				visible: line >= hiddenAbove && line < hiddenAbove + staveLines,
			});
		}
		// Only draw the end barline. Each measure's end barline is the same line
		// as the next measure's left edge, so internal measures still get a divider;
		// only the first measure of a system loses its left barline (intended). The
		// final measure of the piece closes with a thin-thick end barline.
		// When the system has multiple staves, the per-measure stave connector
		// already draws this line across the staves, so the per-stave end barline
		// is suppressed to avoid doubling it.
		// Exception: a lone TAB stave has no system connector to close its left
		// edge, so its system-start measure draws an explicit begin barline.
		// Repeat signs are the exception to the multi-stave suppression: no StaveConnector type
		// draws repeat dots, so every stave draws the whole sign itself and drawConnectors
		// retraces just the bars across the system.
		const repeatBegin =
			column.decoration.repeatBegin && !column.suppressBegRepeat;
		stave.setBegBarType(
			repeatBegin
				? Barline.type.REPEAT_BEGIN
				: isTab && this.totalStaves === 1 && column.isSystemStart
					? Barline.type.SINGLE
					: Barline.type.NONE,
		);
		// A <bar-style> vexflow has no type for is set to NONE here and painted by
		// drawCustomBarline once the stave is on the canvas; 'none' is genuinely no line, so
		// it takes NONE and no repaint. A repeat sign outranks any bar style — MusicXML puts
		// the two in the same <barline>, and the repeat is the one that changes what's played.
		const styled = column.barStyle
			? BAR_STYLE_TYPES[column.barStyle]
			: undefined;
		stave.setEndBarType(
			column.repeatBoth
				? Barline.type.REPEAT_BOTH
				: column.decoration.repeatEnd
					? Barline.type.REPEAT_END
					: this.totalStaves > 1
						? Barline.type.NONE
						: column.barStyle
							? (styled ?? Barline.type.NONE)
							: column.isLastMeasure
								? Barline.type.END
								: Barline.type.SINGLE,
		);
		// The volta (ending) bracket rides above the top stave of the system only — it labels
		// the passage, not each instrument. Registered as an obstacle after the draw below so
		// chord symbols and words in the same measure lift clear of it.
		// vexflow anchors a volta at getYForTopText(numLines) — five text lines up, far above
		// everything else vexml draws — so shift it back down to a fixed gap over the top staff
		// line, in the same band as the other above-stave decorations.
		// The bracket is drawn with the stave, before the notes are formatted, so a measure
		// whose notes climb past that gap can't be seen yet — the lift that clears them is
		// measured on the previous pass and arrives per system in voltaLifts. Per SYSTEM, not
		// per measure: one bracket spans its measures as separate BEGIN/MID/END stave voltas,
		// and heights that disagree would draw it as a staircase.
		const volta = column.decoration.volta;
		const voltaBase = stave.getYForLine(0) - VOLTA_STAVE_GAP;
		const voltaTop = voltaBase - (this.voltaLifts.get(column.systemIndex) ?? 0);
		if (volta && column.staveRow === 0) {
			stave.setVoltaType(
				volta.type,
				volta.label,
				voltaTop - stave.getYForTopText(stave.getNumLines()),
			);
		}

		// The previous measure's effective signatures (carried forward), used to
		// spot a mid-system change. getClef/getKey/getTime return what's in effect at
		// the measure start, so M3 of a piece that changed key at M2 reads the same
		// key as M2 — no spurious redraw.
		const prevMeasure = part.measures[m - 1];
		const key = measure.getKey(staffNumber);
		const prevKey = prevMeasure?.getKey(staffNumber) ?? null;
		const keyChanged =
			this.reader.keyIdentity(key) !== this.reader.keyIdentity(prevKey);
		const clefName = clef
			? this.signatures.vexflowClef(clef.sign, clef.line)
			: 'treble';
		// A <key> spelled out accidental by accidental (<key-step>/<key-alter>), which vexflow's
		// own KeySignature can't take a spec for; empty for an ordinary <fifths> key. The
		// positions depend on the clef, so this is read per stave.
		const customKey =
			key && !isTab ? this.signatures.customKeyAccidentals(key, clefName) : [];
		// The key being replaced, so vexflow can print the naturals that cancel it — the
		// only thing a change TO C major has to draw, and without it M2 of
		// transpose_change looked like no change happened at all. vexflow applies the
		// modern rule itself (cancel only the accidentals dropped, or all of them when
		// sharps flip to flats), so this hands it the old spec and lets it decide.
		// Only at a change: restating an unchanged key at a system start cancels nothing.
		// A non-traditional key has no spec to cancel with, either side of the change.
		const cancelKeySpec =
			keyChanged && prevKey?.rootNote && customKey.length === 0
				? this.signatures.vexflowKeySpec(prevKey)
				: undefined;
		const addKeySignature = () => {
			if (customKey.length > 0) {
				stave.addModifier(
					new CustomKeySignature(customKey).setPosition(
						StaveModifierPosition.BEGIN,
					),
					StaveModifierPosition.BEGIN,
				);
			} else if (key?.rootNote) {
				stave.addKeySignature(
					this.signatures.vexflowKeySpec(key),
					cancelKeySpec,
				);
			}
		};
		// Against the clef in effect at the END of the previous measure, not at its start: a
		// change stated INSIDE that measure (or as its trailing courtesy clef) has already
		// been announced, so restating it here would draw the same glyph twice.
		const clefChanged =
			m > 0 &&
			this.signatures.vexflowClefSpec(clef) !==
				this.signatures.vexflowClefSpec(
					this.reader.clefAtEndOf(prevMeasure, staffNumber),
				);

		// Clef and key print at every system start (re-stated on each new line).
		// A mid-system clef or key change is also redrawn where it happens (the time
		// signature is not repeated for either). The changed clef is drawn at the
		// small "change clef" size, which is how a mid-piece clef change is engraved —
		// it reads as a correction to the stave, not a fresh system opening.
		if (column.isSystemStart) {
			if (isTab) {
				const tabStave = stave as TabStave;
				tabStave.addTabGlyph();
				this.resizeTabClef(tabStave, tabLines);
			} else {
				// A part that declares no <clef> at all is engraved as treble — the same
				// fallback buildNotes already positions its notes with, and what MuseScore and
				// OSMD draw. Without it the stave opened with an empty gap where the glyph
				// belongs (the lead width reserves the room either way).
				stave.addClef(
					clefName,
					undefined,
					this.signatures.vexflowClefAnnotation(clef?.octaveChange ?? null),
				);
			}
			// Tab staves carry no key signature.
			if (!isTab) {
				addKeySignature();
			}
		} else {
			if (clef && clefChanged && !isTab) {
				stave.addClef(
					this.signatures.vexflowClef(clef.sign, clef.line),
					'small',
					this.signatures.vexflowClefAnnotation(clef.octaveChange),
				);
			}
			if (keyChanged && !isTab) {
				addKeySignature();
			}
		}

		// Unlike clef and key, the time signature is not re-stated at every
		// system start — only at the piece start and wherever the meter changes
		// (a change that lands on a system break still redraws here).
		//
		// A part that states no <time> anywhere opens in 4/4, the meter a reader assumes when
		// none is printed — the counterpart of the treble-clef fallback above. An explicit
		// <senza-misura> is a different thing and still prints nothing.
		// ponytail: the DEFAULT is display-only — meterBeats still reports 0 for an absent
		// <time>, so an unmetered measure is sized by its own content rather than padded out
		// to four beats. Printing an assumed meter is a convention; spacing to one would be
		// guessing at the music.
		const time = measure.getTime(staffNumber);
		const timeSpec =
			this.signatures.timeSignatureSpec(time) ??
			(m === 0 && !time ? '4/4' : null);
		const prevTimeSpec = this.signatures.timeSignatureSpec(
			prevMeasure?.getTime(staffNumber) ?? null,
		);
		if (timeSpec && !isTab && (m === 0 || timeSpec !== prevTimeSpec)) {
			stave.addTimeSignature(timeSpec);
		}

		// A gap is non-musical, so it never shows a measure number (its neighbors keep
		// their own printed numbers — insertion shifts indexes, not labels).
		const showNumber =
			!this.gaps.has(m) && this.showsMeasureNumber(m, column.isSystemStart);
		// A bracket (drawn below) has a top curl that sits where vexflow's
		// setMeasure centers the measure number, so the number gets occluded — true
		// for a multi-stave part's own bracket, for the system bracket of a
		// notation+tab pair split across parts, and for a <part-group> bracket that
		// starts on the top part (the only one whose curl reaches the number). Only
		// for a bracket do we draw the number ourselves, left-aligned just right of
		// the barline and lifted above the curl; the curly brace doesn't reach that
		// high, so it keeps vexflow's placement. The number prints once
		// (measureNumbered), on the top stave.
		const numberOccluded =
			column.isSystemStart &&
			((visibleCount > 1 &&
				this.reader.partSymbol(part, this.visibility) === 'bracket') ||
				this.reader.partsPairTabWithNotation(this.parts, this.visibility) ||
				this.partGroups.some(
					(group) => group.symbol === 'bracket' && group.fromPart === 0,
				));
		let numbered = false;
		if (showNumber && !column.measureNumbered && !numberOccluded) {
			stave.setMeasure(Number(measure.number));
			// vexflow centers the number on the stave's x, baselined 3px under its top-text
			// line (Stave.draw).
			this.context.save();
			this.context.setFont(stave.getFont());
			this.addMeasureNumberObstacle(
				String(Number(measure.number)),
				stave.getX(),
				stave.getYForTopText(0) + 3,
				true,
			);
			this.context.restore();
			numbered = true;
		}

		// The volta bracket is drawn with the stave, so register the band it occupies as an
		// obstacle now: chord symbols and words placed later in this measure lift clear of it
		// instead of overprinting the bracket and its "1." label. The label hangs below the
		// bracket line, so the box runs from the line down past the text.
		if (volta && column.staveRow === 0) {
			const rect = new Rect(
				stave.getX(),
				voltaTop,
				stave.getWidth(),
				VOLTA_LABEL_DROP,
			);
			this.collisionResolver.add({ rect, kind: 'annotation' });
			this.spill.growDecorationTop(column.systemIndex, rect.y);
			this.spill.growHighestTop(column.systemIndex, rect.y);
		}

		// The NEXT measure's bracket, registered a column early. A chord symbol is anchored at
		// its note's x and runs right from there, so one on this measure's last beat overruns
		// the barline into the next measure — where a volta may start, putting "G♯m11" right
		// under a "1.2.3." label. That bracket is otherwise only registered when its own column
		// is drawn, which is after this measure's annotations are placed, so the symbol would
		// never see it. Same system means the same top staff line, so the y above still holds;
		// the next column re-adds the identical rect, which changes nothing.
		if (column.staveRow === 0 && column.nextVolta) {
			this.collisionResolver.add({
				rect: new Rect(
					column.nextVolta.x,
					voltaTop,
					column.nextVolta.width,
					VOLTA_LABEL_DROP,
				),
				kind: 'annotation',
			});
		}

		if (showNumber && !column.measureNumbered && numberOccluded) {
			this.context.save();
			this.context.setFont(stave.getFont());
			this.context.setFillStyle(this.textColor);
			this.context.fillText(
				measure.number,
				stave.getX() + 4,
				stave.getYForTopText(0) - 14,
			);
			this.addMeasureNumberObstacle(
				measure.number,
				stave.getX() + 4,
				stave.getYForTopText(0) - 14,
				false,
			);
			this.context.restore();
			numbered = true;
		}
		// Seed this row's spill record even when nothing is drawn on it, so the re-spacing
		// pass still knows where its staff lines sit (a tab stave is taller than a
		// notation one, and an empty stave still occupies its height).
		this.spill.seedRow(column.systemIndex, column.staveRow, stave);

		return {
			stave,
			isTab,
			volta:
				volta && column.staveRow === 0
					? { base: voltaBase, top: voltaTop }
					: null,
			multiRestCount: this.multiRests.get(m) ?? null,
			numbered,
		};
	}

	/*
	 * Draw a consolidated multi-bar rest over `stave`: the thick horizontal bar with its
	 * measure count centered above. Drawn straight onto the stave rather than as a
	 * tickable — it stands for the whole measure, so there is nothing for the formatter
	 * to space it against.
	 */
	drawMultiRest(stave: Stave, count: number): void {
		// vexflow measures its padding from the stave's x, so the left inset has to clear
		// the clef/key/time first — otherwise the bar starts under the time signature and
		// ends well short of the barline instead of centering in the note area.
		new MultiMeasureRest(count, {
			numberOfMeasures: count,
			paddingLeft: stave.getNoteStartX() - stave.getX() + MULTI_REST_PADDING,
			paddingRight: MULTI_REST_PADDING,
		})
			.setStave(stave)
			.setContext(this.context)
			.draw();
	}

	/*
	 * The "TAB" glyph is sized and centered for a 6-line staff. For a shorter tab staff
	 * (e.g. a 4-string bass) shrink and re-center it to fit. Reaches into vexflow's clef
	 * modifier directly — there's no public API for this.
	 */
	private resizeTabClef(stave: TabStave, tabLines: number): void {
		if (tabLines === 6) {
			return;
		}
		const [tabClef] = stave.getModifiers(
			undefined,
			'Clef',
		) as unknown as Array<{
			line: number;
			fontInfo: { size: number };
		}>;
		if (tabClef) {
			tabClef.fontInfo.size *= (tabLines - 1) / 5;
			tabClef.line = (tabLines - 1) / 2;
		}
	}

	/*
	 * Register a printed measure number as a collision obstacle, measured with whatever font
	 * the caller has set on the context. It sits at the stave's left edge, which is exactly
	 * where a rehearsal mark anchors — without this the section header prints on top of it.
	 * `centered` matches vexflow's own placement (the number straddles the stave x); the
	 * bracket-occluded path draws it left-aligned instead.
	 */
	private addMeasureNumberObstacle(
		label: string,
		x: number,
		baseline: number,
		centered: boolean,
	): void {
		const ink = this.context.measureText(label);
		this.collisionResolver.add({
			rect: new Rect(
				centered ? x - ink.width / 2 : x,
				baseline + ink.y,
				ink.width,
				ink.height,
			),
			kind: 'annotation',
		});
	}
}
