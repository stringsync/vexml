import type { Chord, Note } from '@stringsync/mdom';
import { Beam, Curve, type StaveNote, StaveTie, Tuplet } from 'vexflow';

// Beams: mdom groups the <beam> runs (measure.beams); map each group's notes to
// their StaveNotes. Built before formatting so the beamed notes drop their flags.
export function buildBeams(
	groups: Note[][],
	byLead: Map<Note, StaveNote>,
): Beam[] {
	const beams: Beam[] = [];
	for (const group of groups) {
		const notes = group
			.map((note) => byLead.get(note))
			.filter((note): note is StaveNote => note !== undefined);
		if (notes.length > 1) {
			// auto_stem=true picks one direction for the whole group (notes' own
			// autoStem would conflict). But explicit <stem>s (e.g. voice separation)
			// must stand, so only auto-stem when no note in the group has one.
			const autoStem = group.every((note) => !note.stem);
			beams.push(new Beam(notes, autoStem));
		}
	}
	return beams;
}

// Tuplets: a <tuplet>start..stop span covers every note between the two markers
// (the inner notes carry no marker), so slice the chord run by index. The ratio
// comes from the start note's <time-modification> (e.g. 3:2 -> "3").
export function buildTuplets(
	chords: Chord[],
	byLead: Map<Note, StaveNote>,
): Tuplet[] {
	const tuplets: Tuplet[] = [];
	let start = -1;
	chords.forEach((chord, i) => {
		for (const tuplet of chord.lead.tuplets) {
			if (tuplet.tupletType === 'start') {
				start = i;
			} else if (tuplet.tupletType === 'stop' && start >= 0) {
				const group = chords
					.slice(start, i + 1)
					.map((c) => byLead.get(c.lead))
					.filter((n): n is StaveNote => n !== undefined);
				if (group.length > 1) {
					const ratio = chords[start]?.lead.timeModification;
					tuplets.push(
						new Tuplet(
							group,
							ratio
								? { numNotes: ratio.actual, notesOccupied: ratio.normal }
								: undefined,
						),
					);
				}
				start = -1;
			}
		}
	});
	return tuplets;
}

// Ties (<tied>) and slurs (<slur>) both connect a start note to its partner;
// ties draw as a StaveTie, slurs as a Curve. Drawn after the notes are placed.
export function buildTies(
	chords: Chord[],
	byLead: Map<Note, StaveNote>,
): StaveTie[] {
	const ties: StaveTie[] = [];
	for (const chord of chords) {
		const firstNote = byLead.get(chord.lead);
		for (const tie of chord.lead.ties) {
			if (tie.tieType !== 'start' || !tie.partner || !firstNote) {
				continue;
			}
			const lastNote = byLead.get(tie.partner.note);
			if (lastNote) {
				ties.push(
					new StaveTie({
						firstNote,
						lastNote,
						firstIndexes: [0],
						lastIndexes: [0],
					}),
				);
			}
		}
	}
	return ties;
}

export function buildSlurs(
	chords: Chord[],
	byLead: Map<Note, StaveNote>,
): Curve[] {
	const slurs: Curve[] = [];
	for (const chord of chords) {
		const from = byLead.get(chord.lead);
		for (const slur of chord.lead.slurs) {
			if (slur.slurType !== 'start' || !slur.partner || !from) {
				continue;
			}
			const to = byLead.get(slur.partner.note);
			if (to) {
				// <slur placement="above"> arcs over the top (anchored at the stem
				// tops, opening downward); otherwise vexflow picks the side from the
				// notes' stems.
				const options =
					slur.placement === 'above'
						? {
								position: Curve.Position.NEAR_TOP,
								openingDirection: 'down' as const,
							}
						: {};
				slurs.push(new Curve(from, to, options));
			}
		}
	}
	return slurs;
}
