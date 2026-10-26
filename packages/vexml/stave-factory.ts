import type { LineDetail, Measure, Part } from '@stringsync/mdom';
import { type Stave, StaveModifierPosition, TabStave } from 'vexflow/core';
import { CustomKeySignature } from './custom-key-signature';
import { DetailedStave, type LineStyle } from './detailed-stave';
import type { SignatureTranslator } from './signature-translator';
import { StaffKeySignature } from './staff-scaled-signatures';
import type { StavePlan } from './stave-plan';

/** vexflow's default space between staff lines, in px. */
const STAVE_LINE_DISTANCE = 10;

/* The staff-size percent an ossia or cue staff draws at when it states none. */
const SMALL_STAFF_SIZE = 75;

/* A freshly placed stave, before any clef, key or barline is set on it. */
export interface PlacedStave {
	stave: Stave;
	/** Whether the stave is a TabStave (fret numbers; no clef, key or time). */
	isTab: boolean;
	/** How many strings a tab stave has; 0 for a notation stave. */
	tabLines: number;
}

/*
 * The part of building a stave that doesn't depend on where in the score it sits: the
 * vexflow Stave/TabStave with the right line count, and the clef and key a system opens
 * with. StaveBuilder dresses the measure's staves with it, and SignatureFold redraws the
 * opening from it, so the pinned strip and the real system start can't drift apart.
 */
export class StaveFactory {
	constructor(
		private readonly signatures: SignatureTranslator,
		private readonly staves: StavePlan,
	) {}

	create(
		part: Part,
		measure: Measure,
		staffNumber: string,
		x: number,
		y: number,
		width: number,
	): PlacedStave {
		// A TAB clef draws on a TabStave whose line count matches the
		// instrument's strings (<staff-lines>: 6 for guitar, 4 for bass).
		const isTab = this.staves.isTab(part, staffNumber);
		const tabLines = isTab ? measure.getStaveLines(staffNumber) : 0;
		const staveLines = measure.getStaveLines(staffNumber);
		// Half the lines a reduced stave drops come off the top. The whole part of that says
		// which five-line row it starts on; the leftover half (an even line count can't sit on
		// the five-line rows) nudges the whole frame (lines and note rows together) down a
		// half space, which is how an even-line stave centers.
		const hiddenAbove = Math.max(0, Math.floor((5 - staveLines) / 2));
		const halfNudge = Math.max(0, (5 - staveLines) / 2 - hiddenAbove);
		// staff-size is a percentage of normal: the line spacing shrinks with it, and every row
		// vexflow measures off the stave (notes, ledger lines, clef, key) follows.
		const staffType = measure
			.getStaffDetails(staffNumber)
			?.child('staff-type')
			?.text?.trim();
		const size =
			measure.getStaffDetails(staffNumber)?.staffSize ??
			(staffType === 'ossia' || staffType === 'cue' ? SMALL_STAFF_SIZE : 100);
		const spacing = (STAVE_LINE_DISTANCE * size) / 100;
		// The shrunk five lines center on where the full-size ones would sit, so the staff
		// stays in its row and only the ink shrinks.
		const centering = 2 * (STAVE_LINE_DISTANCE - spacing);
		const details = isTab
			? []
			: this.lineDetails(measure, staffNumber, staveLines, hiddenAbove);
		const styled = details.flatMap((detail) =>
			detail.style ? [detail.style] : [],
		);
		const stave = isTab
			? new TabStave(x, y, width, { numLines: tabLines })
			: new DetailedStave(
					x,
					y,
					width,
					{
						// A reduced stave keeps the five-line frame and HIDES the lines it doesn't
						// draw, rather than declaring fewer of them. vexflow anchors a shorter stave
						// at the top: its lines come off the bottom, so a 1-line percussion stave
						// draws where a five-line stave's TOP line goes, while leaving note rows,
						// ledger lines, clef and time signature in the five-line frame regardless.
						// Hiding instead centers the drawn lines the way MuseScore and OSMD do (the
						// single line lands on the middle line, with the percussion clef straddling
						// it) and leaves everything measured off the stave (note rows, connectors,
						// part spacing) exactly as it was.
						spaceAboveStaffLn:
							((4 + halfNudge) * STAVE_LINE_DISTANCE + centering) / spacing,
						spacingBetweenLinesPx: spacing,
					},
					styled,
				);
		// Tab is exempt: its line count IS its string count, so a 4-string stave draws four
		// lines and means it.
		for (let line = 0; line < 5 && !isTab && staveLines < 5; line++) {
			stave.setConfigForLine(line, {
				visible: line >= hiddenAbove && line < hiddenAbove + staveLines,
			});
		}
		// A <line-detail> hides its line from vexflow: a styled one is drawn by DetailedStave
		// instead, and print-object="no" draws nothing.
		for (const { row } of details) {
			stave.setConfigForLine(row, { visible: false });
		}
		// staff-details print-object="no" hides the lines; clef, key and notes stay.
		// An ossia staff shows only where it holds notes.
		const emptyOssia =
			staffType === 'ossia' &&
			!measure.notes.some((n) => n.staff === staffNumber && !n.isRest);
		if (
			measure.getStaffDetails(staffNumber)?.printObject === false ||
			emptyOssia
		) {
			for (let line = 0; line < 5; line++) {
				stave.setConfigForLine(line, { visible: false });
			}
		}
		return { stave, isTab, tabLines };
	}

	/*
	 * The `<line-detail>` overrides of a notation stave, as stave rows. `style` is null for a
	 * line that print-object="no" removes. line="1" is the bottom line, the last drawn row.
	 */
	private lineDetails(
		measure: Measure,
		staffNumber: string,
		staveLines: number,
		hiddenAbove: number,
	): Array<{ row: number; style: LineStyle | null }> {
		const details: Array<{ row: number; style: LineStyle | null }> = [];
		for (const detail of measure.getLineDetails(staffNumber)) {
			const row = hiddenAbove + staveLines - detail.line;
			if (detail.line < 1 || detail.line > staveLines) {
				continue;
			}
			if (detail.getAttribute('print-object') === 'no') {
				details.push({ row, style: null });
				continue;
			}
			const width = detail.width;
			const color = detail.getAttribute('color');
			const dash = this.dashOf(detail);
			if (width === null && !color && dash.length === 0) {
				continue;
			}
			details.push({ row, style: { row, width, color, dash } });
		}
		return details;
	}

	private dashOf(detail: LineDetail): number[] {
		const type = detail.getAttribute('line-type');
		if (type !== 'dashed' && type !== 'dotted') {
			return [];
		}
		// line-detail has no dash-length or space-length of its own.
		return type === 'dotted' ? [1, 3] : [5, 3];
	}

	/*
	 * The clef and key a system opens with, as in effect at `measure`'s start. `cancelKeySpec`
	 * is the key being replaced when the opening is also a key change, so its naturals print.
	 */
	addOpening(
		placed: PlacedStave,
		measure: Measure,
		staffNumber: string,
		cancelKeySpec?: string,
	): void {
		const { stave, isTab, tabLines } = placed;
		if (isTab) {
			const tabStave = stave as TabStave;
			tabStave.addTabGlyph();
			this.resizeTabClef(tabStave, tabLines);
			// Tab staves carry no key signature.
			return;
		}
		const clef = measure.getClef(staffNumber);
		// A part that declares no <clef> at all is engraved as treble: the same fallback
		// buildNotes already positions its notes with, and what MuseScore and OSMD draw.
		// Without it the stave opened with an empty gap where the glyph belongs (the lead
		// width reserves the room either way).
		// print-object="no" on the <clef> keeps it in force (the notes still sit by it) but draws no glyph.
		if (clef?.getAttribute('print-object') !== 'no') {
			stave.addClef(
				this.clefName(measure, staffNumber),
				undefined,
				this.signatures.vexflowClefAnnotation(clef?.octaveChange ?? null),
			);
		}
		this.shrinkClef(stave);
		this.addKey(stave, measure, staffNumber, cancelKeySpec);
	}

	/* The key in effect at `measure`'s start, spelled out accidental by accidental when the
	 * document writes it that way (vexflow's own KeySignature can't take such a spec). */
	addKey(
		stave: Stave,
		measure: Measure,
		staffNumber: string,
		cancelKeySpec?: string,
	): void {
		const key = measure.getKey(staffNumber);
		if (key?.getAttribute('print-object') === 'no') {
			return;
		}
		const customKey = this.customKey(measure, staffNumber);
		if (customKey.length > 0) {
			stave.addModifier(
				new CustomKeySignature(customKey).setPosition(
					StaveModifierPosition.BEGIN,
				),
				StaveModifierPosition.BEGIN,
			);
		} else if (key?.rootNote) {
			stave.addModifier(
				new StaffKeySignature(
					this.signatures.vexflowKeySpec(key),
					cancelKeySpec,
				).setPosition(StaveModifierPosition.BEGIN),
				StaveModifierPosition.BEGIN,
			);
		}
	}

	/* The accidentals of a <key> spelled out by <key-step>/<key-alter>; empty for an ordinary
	 * <fifths> key. The positions depend on the clef, so this is read per stave. */
	customKey(
		measure: Measure,
		staffNumber: string,
	): ReturnType<SignatureTranslator['customKeyAccidentals']> {
		const key = measure.getKey(staffNumber);
		return key
			? this.signatures.customKeyAccidentals(
					key,
					this.clefName(measure, staffNumber),
				)
			: [];
	}

	/* The clef in effect at `measure`'s start, as a comparable spec (null when none is set). */
	clefSpec(measure: Measure, staffNumber: string): string | null {
		return this.signatures.vexflowClefSpec(measure.getClef(staffNumber));
	}

	private clefName(measure: Measure, staffNumber: string): string {
		const clef = measure.getClef(staffNumber);
		return clef ? this.signatures.vexflowClef(clef.sign, clef.line) : 'treble';
	}

	/* A staff at staff-size percent draws its clef at that share of the glyph's size. */
	private shrinkClef(stave: Stave): void {
		const ratio = stave.getSpacingBetweenLines() / STAVE_LINE_DISTANCE;
		const [clef] = stave.getModifiers(undefined, 'Clef') as unknown as Array<{
			fontInfo: { size: number };
		}>;
		if (ratio !== 1 && clef) {
			clef.fontInfo.size *= ratio;
		}
	}

	/*
	 * The "TAB" glyph is sized and centered for a 6-line staff. For a shorter tab staff
	 * (e.g. a 4-string bass) shrink and re-center it to fit. Reaches into vexflow's clef
	 * modifier directly: there's no public API for this.
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
}
