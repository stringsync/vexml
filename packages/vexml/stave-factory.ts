import type { Measure, Part } from '@stringsync/mdom';
import { Stave, StaveModifierPosition, TabStave } from 'vexflow';
import { CustomKeySignature } from './custom-key-signature';
import type { SignatureTranslator } from './signature-translator';
import type { StavePlan } from './stave-plan';

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
		// the five-line rows) nudges the whole frame — lines and note rows together — down a
		// half space, which is how an even-line stave centers.
		const hiddenAbove = Math.max(0, Math.floor((5 - staveLines) / 2));
		const halfNudge = Math.max(0, (5 - staveLines) / 2 - hiddenAbove);
		const stave = isTab
			? new TabStave(x, y, width, { numLines: tabLines })
			: new Stave(x, y, width, {
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
		return { stave, isTab, tabLines };
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
		// A part that declares no <clef> at all is engraved as treble — the same fallback
		// buildNotes already positions its notes with, and what MuseScore and OSMD draw.
		// Without it the stave opened with an empty gap where the glyph belongs (the lead
		// width reserves the room either way).
		stave.addClef(
			this.clefName(measure, staffNumber),
			undefined,
			this.signatures.vexflowClefAnnotation(clef?.octaveChange ?? null),
		);
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
		const customKey = this.customKey(measure, staffNumber);
		if (customKey.length > 0) {
			stave.addModifier(
				new CustomKeySignature(customKey).setPosition(
					StaveModifierPosition.BEGIN,
				),
				StaveModifierPosition.BEGIN,
			);
		} else if (key?.rootNote) {
			stave.addKeySignature(this.signatures.vexflowKeySpec(key), cancelKeySpec);
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
}
