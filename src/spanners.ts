import type { Chord, Note } from '@stringsync/mdom';
import {
	Beam,
	Curve,
	type StaveNote,
	StaveTie,
	type TabNote,
	TabSlide,
	TabTie,
	Tuplet,
} from 'vexflow';

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

// An explicit hammer-on/pull-off marker in <notations><technical>, or null when
// neither is present (the common case — most tab is notated with only a slur).
function explicitTechnique(note: Note): 'hammer' | 'pull' | null {
	const technical = note.child('notations')?.child('technical');
	if (technical?.child('hammer-on')) {
		return 'hammer';
	}
	if (technical?.child('pull-off')) {
		return 'pull';
	}
	return null;
}

// Hammer-ons and pull-offs on a TAB stave. Both are notated with a plain <slur>;
// vexflow draws each as a TabTie labelled "H" or "P". When no explicit
// <hammer-on>/<pull-off> marker says which, infer from the fret motion of the
// lead string: a higher target fret is a hammer-on, a lower one a pull-off (pulling
// off to an open string is just a target fret of 0).
export function buildHammerPulls(
	chords: Chord[],
	byTabLead: Map<Note, TabNote>,
	showText: boolean,
): TabTie[] {
	const ties: TabTie[] = [];
	for (const chord of chords) {
		const firstNote = byTabLead.get(chord.lead);
		if (!firstNote) {
			continue;
		}
		const firstIndexes = firstNote.getPositions().map((_, i) => i);
		for (const slur of chord.lead.slurs) {
			if (slur.slurType !== 'start') {
				continue;
			}
			const partner = slur.partner?.note;
			const lastNote = partner && byTabLead.get(partner);
			// An unclosed slur (no resolved partner) isn't a real hammer-on/pull-off;
			// skip it rather than drawing a dangling tie.
			if (!partner || !lastNote) {
				continue;
			}
			const hammer =
				(explicitTechnique(chord.lead) ??
					((partner.fret ?? 0) > (chord.lead.fret ?? 0)
						? 'hammer'
						: 'pull')) === 'hammer';
			const notes = {
				firstNote,
				lastNote,
				firstIndexes,
				lastIndexes: lastNote.getPositions().map((_, i) => i),
			};
			const tie = hammer
				? TabTie.createHammeron(notes)
				: TabTie.createPulloff(notes);
			// The arc always draws; clear the "H"/"P" label when the text is off.
			if (!showText) {
				tie.setText('');
			}
			ties.push(tie);
		}
	}
	return ties;
}

// Slides on a TAB stave: a <slide> (or <glissando>) start..stop pair, drawn as a
// TabSlide — a diagonal line between the two frets, angled up or down by the fret
// motion. Paired by `number` like every spanner; resolved over the whole score so a
// slide can cross a barline. (Unlike hammer/pull there's no "H"/"P" label, so the
// slide direction is purely cosmetic — vexflow just tilts the line.)
export function buildSlides(
	chords: Chord[],
	byTabLead: Map<Note, TabNote>,
	showText: boolean,
): TabSlide[] {
	const slides: TabSlide[] = [];
	const open = new Map<string, { note: TabNote; fret: number }>();
	for (const chord of chords) {
		const tabNote = byTabLead.get(chord.lead);
		const notations = chord.lead.child('notations');
		if (!tabNote || !notations) {
			continue;
		}
		const markers = [
			...notations.childrenNamed('slide'),
			...notations.childrenNamed('glissando'),
		];
		for (const marker of markers) {
			const number = marker.getAttribute('number') ?? '1';
			const fret = chord.lead.fret ?? 0;
			if (marker.getAttribute('type') === 'start') {
				open.set(number, { note: tabNote, fret });
			} else if (marker.getAttribute('type') === 'stop') {
				const from = open.get(number);
				open.delete(number);
				if (!from) {
					continue;
				}
				const notes = {
					firstNote: from.note,
					lastNote: tabNote,
					firstIndexes: from.note.getPositions().map((_, i) => i),
					lastIndexes: tabNote.getPositions().map((_, i) => i),
				};
				const slide =
					fret > from.fret
						? TabSlide.createSlideUp(notes)
						: TabSlide.createSlideDown(notes);
				// The line always draws; clear the "sl." label when the text is off.
				if (!showText) {
					slide.setText('');
				}
				slides.push(slide);
			}
		}
	}
	return slides;
}

// The highest (smallest y) and lowest (largest y) drawn point of a note,
// covering both its noteheads and, when present, its stem tip.
function noteExtents(note: StaveNote): { top: number; bottom: number } {
	const { yTop, yBottom } = note.getNoteHeadBounds();
	let top = yTop;
	let bottom = yBottom;
	if (note.hasStem()) {
		const { topY, baseY } = note.getStemExtents();
		top = Math.min(top, topY, baseY);
		bottom = Math.max(bottom, topY, baseY);
	}
	return { top, bottom };
}

// vexflow anchors a Curve only at its two endpoints, so the arc ignores notes in
// between and a high (or low) middle note pokes through it. We anchor each
// endpoint on the bulge side of its own noteheads, then raise the bezier control
// points so the arc clears the most extreme note it spans.
export function buildSlurs(
	chords: Chord[],
	byLead: Map<Note, StaveNote>,
): Curve[] {
	const slurs: Curve[] = [];
	chords.forEach((chord, i) => {
		const from = byLead.get(chord.lead);
		for (const slur of chord.lead.slurs) {
			if (slur.slurType !== 'start' || !slur.partner || !from) {
				continue;
			}
			const partner = slur.partner.note;
			const to = byLead.get(partner);
			if (!to) {
				continue;
			}
			const j = chords.findIndex((c) => c.lead === partner);
			const span =
				j > i
					? chords
							.slice(i, j + 1)
							.map((c) => byLead.get(c.lead))
							.filter((n): n is StaveNote => n !== undefined)
					: [from, to];

			// Bulge up for placement="above", down for "below", otherwise opposite the
			// stems (slurs sit on the notehead side). The opening direction forces the
			// arc's sign even when the two endpoints' stems disagree.
			const bulgeUp =
				slur.placement === 'above'
					? true
					: slur.placement === 'below'
						? false
						: from.getStemDirection() !== 1;

			// Anchor each endpoint on the bulge side of its noteheads: NEAR_TOP (stem
			// tip) only when that note's stem points toward the bulge, else NEAR_HEAD
			// (outer notehead). This keeps an "above" slur on stem-down notes pinned to
			// the noteheads instead of the stem tips below them.
			const metric = (note: StaveNote) => {
				const stemUp = note.getStemDirection() === 1;
				return stemUp === bulgeUp
					? Curve.Position.NEAR_TOP
					: Curve.Position.NEAR_HEAD;
			};

			// Lift the control points so the arc midpoint clears the most extreme note
			// in the span and bows well off the noteheads. yShift raises the endpoints
			// off the notes; 0.75*cps.y is the extra rise the cubic bezier gains at its
			// midpoint. The arc height also grows with the slur's width so long slurs get
			// a rounder, taller bow instead of a flat line skimming the noteheads.
			const yShift = 12;
			const margin = 14;
			const width = Math.abs(to.getTieLeftX() - from.getTieRightX());
			const fromY = noteExtents(from);
			const toY = noteExtents(to);
			const midEnd = bulgeUp
				? (fromY.top + toY.top) / 2
				: (fromY.bottom + toY.bottom) / 2;
			const extreme = bulgeUp
				? Math.min(...span.map((n) => noteExtents(n).top))
				: Math.max(...span.map((n) => noteExtents(n).bottom));
			const need = Math.abs(midEnd - extreme) + margin;
			const cpY = Math.max(16, width * 0.12, (need - yShift) / 0.75);

			slurs.push(
				new Curve(from, to, {
					position: metric(from),
					positionEnd: metric(to),
					openingDirection: bulgeUp ? 'down' : 'up',
					yShift,
					cps: [
						{ x: 0, y: cpY },
						{ x: 0, y: cpY },
					],
				}),
			);
		}
	});
	return slurs;
}
