import type { BeamRun, Note } from '@stringsync/mdom';
import { Beam, type StaveNote, Stem } from 'vexflow/core';
import type { Appearance } from './appearance';
import { type BeamFan, FeatheredBeam } from './feathered-beam';
import { NoteheadArticulation } from './notehead-articulation';
import type { ScoreReader } from './score-reader';
import { SpacedBeam } from './spaced-beam';

export type BeamOptions = {
	defaultStem?: 'up' | 'down';
	/* Overrides what a lead resolves to, for a chord split across two staves: it drew one
	 * StaveNote per staff and only one of them is reachable through `byLead`, so the caller
	 * supplies the whole set, already ordered the way the beam should run through them. */
	notesByLead?: Map<Note, StaveNote[]>;
};

/* Builds the beams of beam groups, to the document's beam widths. */
export class BeamBuilder {
	constructor(
		private readonly reader: ScoreReader,
		private readonly appearance: Appearance,
	) {}

	/*
	 * Beams: map each beam group's notes to their StaveNotes. Built before formatting
	 * so the beamed notes drop their flags.
	 */
	build(
		groups: BeamRun[],
		byLead: Map<Note, StaveNote>,
		opts: BeamOptions = {},
	): Beam[] {
		const { defaultStem, notesByLead } = opts;
		const beams: Beam[] = [];
		for (const group of groups) {
			const notes = group.notes
				// Grace notes are beamed by their own GraceNoteGroup; they live in byLead
				// only for slur resolution, so skip them here to avoid a second, conflicting
				// auto-stemmed beam drawn over the ornament.
				.filter((note) => !note.isGrace)
				.flatMap((note) => notesByLead?.get(note) ?? [byLead.get(note)])
				.filter((note): note is StaveNote => note !== undefined);
			if (notes.length > 1) {
				// auto_stem=true picks one direction for the whole group (notes' own
				// autoStem would conflict). But explicit <stem>s (e.g. voice separation)
				// and a multi-voice default direction must stand, so only auto-stem when
				// neither applies.
				// The translator builds such a group already stemmed the beam's way, so the Beam
				// only has to re-stem (rebuilding every notehead, and dropping slash heads) when
				// it didn't.
				const autoStem =
					!defaultStem &&
					group.notes.every((note) => !note.stem) &&
					!notes.every((note) => note.getStemDirection() === beamStem(notes));
				const beam = this.beamOf(notes, autoStem, fanOf(group, this.reader));
				beam.renderOptions.beamWidth =
					this.appearance.lineWidth('beam') ?? beam.renderOptions.beamWidth;
				// The beam just settled stem directions; re-pin articulations placed
				// against each note's pre-beam direction onto the notehead side.
				if (autoStem) {
					notes.forEach((note) => {
						this.reorientArticulations(note);
					});
				}
				// vexflow's flat beam averages stem tips as if all stemmed one way, which parks a
				// beam of opposing written stems (across staves) past its outermost tip.
				const opposed = notes.some(
					(note) => note.getStemDirection() !== notes[0]?.getStemDirection(),
				);
				if (!opposed && this.isFlatBeam(group, byLead)) {
					beam.renderOptions.flatBeams = true;
					// vexflow parks a flat beam at the group's *average* stem tip, so a group
					// spanning a wide range leaves the note closest to the beam with a stub of
					// a stem. Raise vexflow's floor (default 15) so that shortest stem is a
					// full standard stem. Each extra beam adds another level distance, which
					// keeps the innermost beam exactly one standard stem from the notehead.
					beam.renderOptions.minFlatBeamOffset =
						Stem.HEIGHT -
						(beam instanceof SpacedBeam
							? beam.levelDistance()
							: beam.renderOptions.beamWidth * 1.5);
				}
				if (group.breaksAfter.length > 0) {
					beam.breakSecondaryAt(group.breaksAfter);
				}
				beams.push(beam);
			}
		}
		return beams;
	}

	/* The beam for one group: feathered when it fans, spaced when the document sets its levels'
	 * distance, and vexflow's own otherwise. */
	private beamOf(
		notes: StaveNote[],
		autoStem: boolean,
		fan: BeamFan | null,
	): Beam {
		const distance = this.appearance.distance('beam');
		if (fan) {
			return new FeatheredBeam(notes, autoStem, fan).setDistance(distance);
		}
		if (distance !== null) {
			return new SpacedBeam(notes, autoStem).setDistance(distance);
		}
		return new Beam(notes, autoStem);
	}

	/*
	 * Beam slope follows the group's contour (Gould, Behind Bars): a beam slants only
	 * when the run moves consistently one way, and is horizontal otherwise: equal outer
	 * pitches, a contour that reverses direction, or a peak/trough sitting in the middle
	 * (the classic "the highest note isn't an outer note, so the beam is flat").
	 *
	 * A chord contributes its top and bottom notes as two parallel voices, and the run
	 * counts as slanting only if *both* move the same way. So two stacked dyads that each
	 * step up (B4/D#5 -> C#5/E5) still slant, while a run that returns to a pitch its
	 * opening chord already sounded ([B2+G#3+D#4] G#3 D#4) goes flat: its bottom voice
	 * rises but its top voice dips and comes back, so there is no direction to slant to.
	 *
	 * Rests and grace notes are excluded: a rest under a beam sits at a fixed staff
	 * position that has nothing to do with the melodic contour, and graces beam on their
	 * own. vexflow's own slope search (capped at ±0.25) still shapes the slanted case.
	 */
	private isFlatBeam(group: BeamRun, byLead: Map<Note, StaveNote>): boolean {
		// vexflow's `line` counts upward from the bottom stave line, so a higher pitch is
		// a larger number.
		const lines = group.notes
			.filter((note) => !note.isGrace && !note.isRest)
			.map((note) => byLead.get(note))
			.filter((note): note is StaveNote => note !== undefined)
			.map((note) => note.getKeyProps().map((key) => key.line));
		const lo = lines.map((event) => Math.min(...event));
		const hi = lines.map((event) => Math.max(...event));
		if (lines.length < 2) {
			return false;
		}
		// sign is +1 to test a rising run, -1 for a falling one.
		const sorted = (voice: number[], sign: number) =>
			voice.every((line, i, all) => {
				const prev = all.at(i - 1);
				return i === 0 || prev === undefined || sign * (line - prev) >= 0;
			});
		const moved = (voice: number[], sign: number) => {
			const first = voice.at(0);
			const last = voice.at(-1);
			return (
				first !== undefined && last !== undefined && sign * (last - first) > 0
			);
		};
		const monotonic = (sign: number) =>
			sorted(lo, sign) &&
			sorted(hi, sign) &&
			(moved(lo, sign) || moved(hi, sign));
		return !monotonic(1) && !monotonic(-1);
	}

	/*
	 * A Beam reassigns one stem direction across its group, which can flip a note's
	 * direction after addArticulations already placed its marks on the old side. Re-pin
	 * each notehead-side articulation to the now-final stem direction. Fermatas (a@a/a@u)
	 * keep their fixed side, so leave them alone.
	 */
	private reorientArticulations(staveNote: StaveNote): void {
		for (const mod of staveNote.getModifiers()) {
			if (mod instanceof NoteheadArticulation) {
				mod.setSide(staveNote);
			}
		}
	}
}

/*
 * The direction vexflow's Beam picks when it auto-stems a group (its calculateStemDirection,
 * which it does not export): the noteheads' summed distance from the middle line, down when
 * they sit on or above it on balance.
 */
function beamStem(notes: readonly StaveNote[]): number {
	let sum = 0;
	for (const note of notes) {
		for (const props of note.getKeyProps()) {
			sum += props.line - 3;
		}
	}
	return sum >= 0 ? Stem.DOWN : Stem.UP;
}

// The fan of a beam group: the first <beam fan> on any of its notes that asks for a feather.
function fanOf(group: BeamRun, reader: ScoreReader): BeamFan | null {
	for (const note of group.notes) {
		for (const beam of reader.beamsOf(note)) {
			const fan = beam.getAttribute('fan');
			if (fan === 'accel' || fan === 'rit') {
				return fan;
			}
		}
	}
	return null;
}
