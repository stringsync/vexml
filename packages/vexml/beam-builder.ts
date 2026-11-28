import type { BeamRun, Note } from '@stringsync/mdom';
import { type Beam, type StaveNote, Stem } from 'vexflow/core';
import type { Appearance } from './appearance';
import { DEFAULT_BEAM_WIDTH } from './constants';
import { type BeamFan, FeatheredBeam } from './feathered-beam';
import { InvisibleStaveNote } from './invisible-stave-note';
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
				// Hidden notes (print-object="no" or notes replaced by a <beat-repeat>/<slash>
				// sign) draw no noteheads or stems, so skip them too: otherwise vexflow's Beam
				// draws empty stems and beam bars over the replaced beat.
				.filter((note) => !note.isGrace)
				.flatMap((note) => notesByLead?.get(note) ?? [byLead.get(note)])
				.filter(
					(note): note is StaveNote =>
						note !== undefined && !(note instanceof InvisibleStaveNote),
				);
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
				// vexflow's own auto-stem sums distances, so the majority rule stems the notes
				// here and the beam keeps their direction.
				if (autoStem) {
					const direction = beamStem(notes);
					for (const note of notes) {
						note.setStemDirection(direction, true);
					}
				} else {
					// Align any un-stemmed rest inside the beam to the pitched notes' shared
					// direction so it never splits the beam into a fake kneed beam.
					const pitchedDirs = new Set(
						notes
							.filter((note) => !note.isRest())
							.map((note) => note.getStemDirection()),
					);
					if (pitchedDirs.size === 1) {
						const [shared] = pitchedDirs;
						if (shared !== undefined) {
							for (const note of group.notes) {
								if (note.isRest && !note.stem) {
									const restNote = byLead.get(note);
									if (restNote && restNote.getStemDirection() !== shared) {
										restNote.setStemDirection(shared, true);
									}
								}
							}
						}
					}
				}
				const beam = this.beamOf(notes, false, fanOf(group, this.reader));
				// Behind Bars p. 165: when a beam extends across outer rests (or a rest inside
				// a beam explicitly carries a <stem>), draw short stemlets from the beam
				// stopping short of each rest.
				const hasStemletRest =
					(notes[0]?.isRest() ?? false) ||
					(notes.at(-1)?.isRest() ?? false) ||
					group.notes.some(
						(note) =>
							note.isRest && (note.stem === 'up' || note.stem === 'down'),
					);
				if (hasStemletRest) {
					beam.renderOptions.showStemlets = true;
				}
				beam.renderOptions.beamWidth =
					this.appearance.lineWidth('beam') ?? DEFAULT_BEAM_WIDTH;
				// A fractional beam is as long as a notehead (Gould, p. 17); vexflow's default is
				// a fixed 10px, shorter than a head.
				const head = notes[0]?.getGlyphWidth();
				if (head) {
					beam.renderOptions.partialBeamLength = head;
				}
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
					// a stem. Raise vexflow's floor (default 15) for three or more beams so the
					// innermost beam stays a standard stem from the notehead; one- and two-beam
					// horizontal stems are sized in SpacedBeam.calculateFlatSlope (Gould pp. 18-19).
					beam.renderOptions.minFlatBeamOffset =
						Stem.HEIGHT - beam.levelDistance();
				}
				if (group.breaksAfter.length > 0) {
					beam.breakSecondaryAt(group.breaksAfter);
				}
				beams.push(beam);
			}
		}
		return beams;
	}

	/* The beam for one group: feathered when it fans, otherwise SpacedBeam so flat-beam
	 * stem lengths follow Gould and any document beam distance applies. */
	private beamOf(
		notes: StaveNote[],
		autoStem: boolean,
		fan: BeamFan | null,
	): SpacedBeam {
		const distance = this.appearance.distance('beam');
		if (fan) {
			return new FeatheredBeam(notes, autoStem, fan).setDistance(distance);
		}
		return new SpacedBeam(notes, autoStem).setDistance(distance);
	}

	/*
	 * Beam slope follows the notes nearest the beam (Gould, Behind Bars pp. 22-24): the beam
	 * slants with the interval between its outer notes, whatever the inner notes do, and is
	 * horizontal only when
	 * - the outer notes sit on the same line,
	 * - an inner note lies nearer the beam than both outer notes (a concave group),
	 * - the notes repeat a pattern, each step reversing the last, or
	 * - two pitches share the group and the odd end note is the one furthest from the beam.
	 * A convex group (inner notes further from the beam) therefore slopes.
	 *
	 * A chord counts by its note nearest the beam: its top note under a beam above (stems
	 * up), its bottom note under a beam below. Rests and grace notes are excluded: a rest
	 * under a beam sits at a fixed staff position that has nothing to do with the melodic
	 * contour, and graces beam on their own. vexflow's own slope search (capped at +-0.25)
	 * still shapes the slanted case.
	 */
	private isFlatBeam(group: BeamRun, byLead: Map<Note, StaveNote>): boolean {
		const events = group.notes
			.filter((note) => !note.isGrace && !note.isRest)
			.map((note) => byLead.get(note))
			.filter((note): note is StaveNote => note !== undefined);
		if (events.length < 2) {
			return false;
		}
		// vexflow's `line` counts upward from the bottom stave line, so a higher pitch is
		// a larger number. Flip it so a larger number is nearer the beam.
		const up = events[0]?.getStemDirection() !== Stem.DOWN;
		const near = events.map((note) => {
			const lines = note.getKeyProps().map((key) => key.line);
			return up ? Math.max(...lines) : -Math.min(...lines);
		});
		const first = near[0];
		const last = near.at(-1);
		if (first === undefined || last === undefined || first === last) {
			return true;
		}
		const inner = near.slice(1, -1);
		if (inner.some((line) => line > Math.max(first, last))) {
			return true;
		}
		const steps = near
			.slice(1)
			.map((line, i) => Math.sign(line - (near[i] ?? 0)));
		if (
			steps.length >= 3 &&
			steps.every(
				(step, i) => step !== 0 && (i === 0 || step === -(steps[i - 1] ?? 0)),
			)
		) {
			return true;
		}
		// Two pitches, the odd end note furthest from the beam.
		const pitches = new Set(near);
		if (pitches.size === 2 && inner.length > 0) {
			const far = Math.min(first, last);
			const oddFirst = inner.every((line) => line === last);
			const oddLast = inner.every((line) => line === first);
			return (oddFirst && first === far) || (oddLast && last === far);
		}
		return false;
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
 * The direction a beam group stems (Gould, p. 24): the side with more noteheads sets it, unless
 * a minority note lies at least 1½ spaces further from the middle line than the majority's
 * furthest, when the minority's side does. With as many either side, vexflow's rule stands: the
 * summed distance from the middle line decides, down when they sit on or above it on balance.
 */
const FAR_MINORITY = 1.5;

function beamStem(notes: readonly StaveNote[]): number {
	let sum = 0;
	let above = 0;
	let below = 0;
	let aboveFar = 0;
	let belowFar = 0;
	for (const note of notes) {
		if (note.isRest()) {
			continue;
		}
		for (const props of note.getKeyProps()) {
			const offset = props.line - 3;
			sum += offset;
			if (offset > 0) {
				above++;
				aboveFar = Math.max(aboveFar, offset);
			} else if (offset < 0) {
				below++;
				belowFar = Math.max(belowFar, -offset);
			}
		}
	}
	if (above !== below) {
		const aboveMajor = above > below;
		const major = aboveMajor ? aboveFar : belowFar;
		const minor = aboveMajor ? belowFar : aboveFar;
		const minorityWins = minor - major >= FAR_MINORITY;
		return aboveMajor !== minorityWins ? Stem.DOWN : Stem.UP;
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
