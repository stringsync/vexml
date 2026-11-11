import type { Chord, Note as MNote, Part } from '@stringsync/mdom';
import type { RawNote } from './geometry-collector';
import type { ScoreReader } from './score-reader';
import type { StavePlan } from './stave-plan';

/* One note the draw will collect: its beat of the `span` its stave's chords spread across
 * the measure's width, and which of the part's staves it sits on. */
export interface Placeholder {
	mnote: MNote;
	chord: MNote[];
	beat: number;
	span: number;
	part: number;
	staffNumber: string;
	tab: RawNote['tab'];
}

/*
 * Which mdom notes the draw collects into a measure, read off the document and the stave plan
 * with no layout: it walks the same visible staves and staff voices the draw pass builds its
 * notes from (see DrawPass.buildStave), so the sets agree. The provisional geometry boxes them;
 * the headless timeline times them.
 */
export class SoundingNotes {
	// Each measure's placeholders, read off the document once: a progressive render asks again
	// for every undrawn measure as the forecast moves.
	private readonly placeholders = new Map<number, Placeholder[]>();
	private multiRests: ReturnType<ScoreReader['multiRestsOf']> | null = null;

	constructor(
		private readonly reader: ScoreReader,
		private readonly staves: StavePlan,
		private readonly parts: Part[],
	) {}

	/* The notes the draw will collect in measure `m`. */
	of(m: number): Placeholder[] {
		let placeholders = this.placeholders.get(m);
		if (placeholders) {
			return placeholders;
		}
		placeholders = [];
		// A multirest lead draws the consolidated bar in place of its notes, and a stave under a
		// measure style (a measure repeat, or beat repeats or slashes across the whole measure)
		// draws its sign instead (see DrawPass.buildStave).
		this.multiRests ??= this.reader.multiRestsOf(this.parts);
		// The rest of a multirest's run is not drawn at all.
		if (this.multiRests.hidden.has(m)) {
			return [];
		}
		for (const [p, part] of this.parts.entries()) {
			const measure = part.measures[m];
			if (!measure) {
				continue;
			}
			for (const staffNumber of this.staves.visibleNumbers(part)) {
				if (
					this.multiRests.leads.has(m) ||
					this.reader.measureStyleOf(measure, staffNumber)
				) {
					continue;
				}
				const voices = this.reader.staffVoices(measure, staffNumber);
				const chords = voices.flatMap((voice) => voice.chords);
				placeholders.push(
					...this.staveOf(
						chords,
						p,
						staffNumber,
						this.staves.isTab(part, staffNumber),
					),
				);
			}
		}
		this.placeholders.set(m, placeholders);
		return placeholders;
	}

	// The notes of one stave's chords, spread across the box by beat: a placeholder each, its
	// box the size of a notehead or fret.
	private staveOf(
		chords: Chord[],
		part: number,
		staffNumber: string,
		isTab: boolean,
	): Placeholder[] {
		const beats = chords.map((chord) => chord.measureBeat ?? 0);
		const span = Math.max(1, ...beats) + 1;
		const placeholders: Placeholder[] = [];
		for (const [i, chord] of chords.entries()) {
			// A tab stave reserves a rest's time with nothing drawn, and a wholly tied-into chord
			// re-strikes no string, so it prints no fret either (see TabVoiceTranslator.tickables).
			if (
				isTab &&
				(chord.lead.isRest ||
					(!chord.lead.isGrace &&
						chord.notes.every((note) =>
							this.reader.tiesOf(note).some((tie) => tie.tieType === 'stop'),
						)))
			) {
				continue;
			}
			const beat = beats[i] ?? 0;
			for (const mnote of chord.notes) {
				let tab: RawNote['tab'] = null;
				if (isTab) {
					const { string, fret } = mnote;
					if (string === null || fret === null) {
						continue;
					}
					tab = { string, fret };
				}
				placeholders.push({
					mnote,
					chord: chord.notes,
					beat,
					span,
					part,
					staffNumber,
					tab,
				});
			}
		}
		return placeholders;
	}
}
