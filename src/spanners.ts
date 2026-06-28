import type { Chord, Note } from '@stringsync/mdom';
import {
	Beam,
	Curve,
	PedalMarking,
	type StaveNote,
	StaveTie,
	type TabNote,
	TabSlide,
	TabTie,
	type TieNotes,
	Tuplet,
} from 'vexflow';
import {
	SLUR_MARGIN,
	SLUR_MIN_CP_Y,
	SLUR_WIDTH_FACTOR,
	SLUR_Y_SHIFT,
	TAB_TIE_CP1,
	TAB_TIE_CP2,
} from './constants';
import type { PedalMark } from './notes';

// A beam run: the notes joined by their primary (8th-level) beam, plus the indexes
// within the run where the secondary (16th+) beam breaks into sub-beams.
type BeamGroup = { notes: Note[]; secondaryBreaks: number[] };

// Group a voice's chord run into beam runs off the primary <beam number="1">
// markers. Unlike mdom's measure.beams, an "end" does NOT close the run: only a
// "begin" (new run) or a non-beamed note does. This keeps a beat whose primary beam
// is split at a sub-beam boundary — e.g. Guitar Pro encoding a triplet-of-16ths +
// 2-16ths beat as begin,continue,end,continue,end — as one continuous primary beam
// (mdom instead drops the orphaned continue/end notes, leaving them flagged).
// The secondary beam still breaks at those boundaries: any <beam number="2"> "end"
// that isn't the run's last note marks where the 16th beam splits.
export function groupBeams(chords: Chord[]): BeamGroup[] {
	const groups: BeamGroup[] = [];
	let current: BeamGroup | null = null;
	for (const chord of chords) {
		const note = chord.lead;
		const primary = note.beams.find((b) => b.number === '1')?.beamValue;
		if (primary === 'begin') {
			current = { notes: [note], secondaryBreaks: [] };
			groups.push(current);
		} else if (primary === 'continue' || primary === 'end') {
			if (!current) {
				current = { notes: [note], secondaryBreaks: [] };
				groups.push(current);
			} else {
				current.notes.push(note);
			}
		} else {
			current = null;
			continue;
		}
		// A secondary (16th+) beam that ends mid-run splits the sub-beams there. Record
		// the break at this note's index; the last note's "end" is the run end, not a split.
		if (note.beams.some((b) => b.number !== '1' && b.beamValue === 'end')) {
			current.secondaryBreaks.push(current.notes.length - 1);
		}
	}
	// The break index recorded for the run's final note is its terminus, not a split.
	for (const group of groups) {
		group.secondaryBreaks = group.secondaryBreaks.filter(
			(i) => i < group.notes.length - 1,
		);
	}
	return groups;
}

// Beams: map each beam group's notes to their StaveNotes. Built before formatting
// so the beamed notes drop their flags.
export function buildBeams(
	groups: BeamGroup[],
	byLead: Map<Note, StaveNote>,
): Beam[] {
	const beams: Beam[] = [];
	for (const group of groups) {
		const notes = group.notes
			// Grace notes are beamed by their own GraceNoteGroup; they live in byLead
			// only for slur resolution, so skip them here to avoid a second, conflicting
			// auto-stemmed beam drawn over the ornament.
			.filter((note) => !note.isGrace)
			.map((note) => byLead.get(note))
			.filter((note): note is StaveNote => note !== undefined);
		if (notes.length > 1) {
			// auto_stem=true picks one direction for the whole group (notes' own
			// autoStem would conflict). But explicit <stem>s (e.g. voice separation)
			// must stand, so only auto-stem when no note in the group has one.
			const autoStem = group.notes.every((note) => !note.stem);
			const beam = new Beam(notes, autoStem);
			// Flatten dense runs: 4+ notes with at least one 16th. Shorter or
			// coarser runs keep vexflow's default slant.
			const has16th = group.notes.some((note) => note.type === '16th');
			if (notes.length >= 4 && has16th) {
				beam.renderOptions.flatBeams = true;
			}
			if (group.secondaryBreaks.length > 0) {
				beam.breakSecondaryAt(group.secondaryBreaks);
			}
			beams.push(beam);
		}
	}
	return beams;
}

// Tuplets: a <tuplet>start..stop span covers every note between the two markers
// (the inner notes carry no marker), so slice the chord run by index. The ratio
// comes from the start note's <time-modification> (e.g. 3:2 -> "3").
export function buildTuplets<T extends StaveNote | TabNote>(
	chords: Chord[],
	byLead: Map<Note, T>,
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
					.filter((n): n is T => n !== undefined);
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
	// Each chord member can carry its own tie, so map every note (not just the lead)
	// to its StaveNote and notehead index — the tie must land on the right notehead,
	// and its partner may itself be a chord member.
	const placement = new Map<Note, { staveNote: StaveNote; index: number }>();
	const chordOf = new Map<Note, Chord>();
	for (const chord of chords) {
		const staveNote = byLead.get(chord.lead);
		if (staveNote) {
			chord.notes.forEach((note, index) => {
				placement.set(note, { staveNote, index });
				chordOf.set(note, chord);
			});
		}
	}

	const ties: StaveTie[] = [];
	for (const chord of chords) {
		const heads = chord.notes.length;
		for (const note of chord.notes) {
			const from = placement.get(note);
			for (const tie of note.ties) {
				// A tie always joins two notes of the same pitch. When the partner is a
				// chord, mdom can't tell which member it lands on — chord <tied>s usually
				// share number "1", so partner() pairs every start to the chord's first
				// stop. Re-resolve to the same-pitch member so the tie hits the right
				// notehead.
				let partnerNote =
					(tie.partner &&
						samePitchMember(note, chordOf.get(tie.partner.note))) ??
					tie.partner?.note;
				// A chain-middle note carries both a tie stop and a tie start. When the
				// exporter orders <tied start> before <tied stop> on that note, mdom's
				// document-order pairing matches the start to the note's OWN stop — a
				// degenerate self-tie that draws nothing. Re-resolve to the next same-pitch
				// note carrying a tie stop, so each link of the chain draws its own arc.
				if (tie.tieType === 'start' && (!partnerNote || partnerNote === note)) {
					partnerNote = nextTieStopMember(note, chords);
				}
				const to = partnerNote && placement.get(partnerNote);
				if (tie.tieType !== 'start' || !from || !to) {
					continue;
				}
				// A chord member's tie bows away from the chord's center: upper-half
				// notes arc over the top (direction -1), the lower half under the bottom
				// (+1). Otherwise vexflow defaults every tie to the stem direction, so a
				// stem-up chord's top notes would tuck underneath instead of over. Single
				// notes keep that default (a tie opposite the lone stem).
				const direction =
					heads > 1 ? (from.index >= (heads - 1) / 2 ? -1 : 1) : null;

				// When the stop note wraps onto a later system its stave sits to the left
				// of the start note's; one StaveTie would then draw as a single long diagonal
				// slanting across the page. Split it into two partial ties — one bowing off
				// the right edge of the start note's stave ("tie to nothing") and one bowing
				// in from the left edge of the stop note's stave ("tie from nothing"). vexflow
				// renders a StaveTie given only a firstNote (or only a lastNote) exactly so.
				// ponytail: the x-compare assumes a tie's two ends share a staff (true for a
				// pitch continuation); a cross-staff tie would also split here.
				const wraps =
					(to.staveNote.getStave()?.getX() ?? 0) <
					(from.staveNote.getStave()?.getX() ?? 0);
				const specs: TieNotes[] = wraps
					? [
							{
								firstNote: from.staveNote,
								firstIndexes: [from.index],
								lastIndexes: [from.index],
							},
							{
								lastNote: to.staveNote,
								firstIndexes: [to.index],
								lastIndexes: [to.index],
							},
						]
					: [
							{
								firstNote: from.staveNote,
								lastNote: to.staveNote,
								firstIndexes: [from.index],
								lastIndexes: [to.index],
							},
						];
				for (const spec of specs) {
					const staveTie = new StaveTie(spec);
					if (direction !== null) {
						staveTie.setDirection(direction);
					}
					ties.push(staveTie);
				}
			}
		}
	}
	return ties;
}

// The next same-pitch note after `note` (in document order) that carries a tie stop.
// Used to recover the partner of a chain-middle tie start when mdom mis-pairs it to
// the note's own stop (see buildTies). null when the chain dangles past the score.
function nextTieStopMember(note: Note, chords: Chord[]): Note | undefined {
	const p = note.pitch;
	if (!p) {
		return undefined;
	}
	const flat = chords.flatMap((chord) => chord.notes);
	for (let i = flat.indexOf(note) + 1; i < flat.length; i++) {
		const n = flat[i];
		if (
			n?.pitch?.step === p.step &&
			n.pitch?.octave === p.octave &&
			n.pitch?.alter === p.alter &&
			n.ties.some((t) => t.tieType === 'stop')
		) {
			return n;
		}
	}
	return undefined;
}

// The member of `chord` whose pitch matches `note` (a tie's two ends are always the
// same pitch), or null when there's no chord or no match.
function samePitchMember(note: Note, chord: Chord | undefined): Note | null {
	const p = note.pitch;
	if (!chord || !p) {
		return null;
	}
	return (
		chord.notes.find(
			(n) =>
				n.pitch?.step === p.step &&
				n.pitch?.octave === p.octave &&
				n.pitch?.alter === p.alter,
		) ?? null
	);
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
			const lastIndexes = lastNote.getPositions().map((_, i) => i);
			// When the stop note wraps onto a later system its stave sits to the left
			// of the start note's; one TabTie would then draw as a single long diagonal
			// across the page. Split it into a tie bowing off the right edge of the start
			// note's stave and one bowing in from the left edge of the stop note's — same
			// boundary handling as buildTies().
			const wraps =
				(lastNote.getStave()?.getX() ?? 0) <
				(firstNote.getStave()?.getX() ?? 0);
			const specs: TieNotes[] = wraps
				? [
						{ firstNote, firstIndexes, lastIndexes: firstIndexes },
						{ lastNote, firstIndexes: lastIndexes, lastIndexes },
					]
				: [{ firstNote, lastNote, firstIndexes, lastIndexes }];
			for (const notes of specs) {
				const tie = hammer
					? TabTie.createHammeron(notes)
					: TabTie.createPulloff(notes);
				// Widen TabTie's narrowed control points so the filled arc is as thick as
				// the stave-note slurs (vexflow defaults it thinner than a StaveTie).
				tie.renderOptions.cp1 = TAB_TIE_CP1;
				tie.renderOptions.cp2 = TAB_TIE_CP2;
				// The arc always draws; clear the "H"/"P" label when the text is off.
				if (!showText) {
					tie.setText('');
				}
				ties.push(tie);
			}
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
				const notes: TieNotes = {
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

// Sustain pedals (<direction><pedal>): a start..stop pair drawn as a vexflow
// PedalMarking under the stave — the "Ped…*" text by default, or a bracket line
// when the MusicXML carries line="yes". Paired by `number` and resolved over the
// whole score (a pedal can span barlines) like the other spanners; the markers
// arrive in document order, so each stop closes the matching open start.
// ponytail: a pedal whose stop wraps onto a later system isn't split — vexflow
// throws on descending x, so a wrapping pedal would need the partial-span handling
// buildTies uses; add it if a fixture needs one.
export function buildPedals(
	markers: PedalMark[],
	byLead: Map<Note, StaveNote>,
): PedalMarking[] {
	const pedals: PedalMarking[] = [];
	const open = new Map<string, { note: StaveNote; line: boolean }>();
	for (const marker of markers) {
		const staveNote = byLead.get(marker.lead);
		if (!staveNote) {
			continue;
		}
		if (marker.type === 'start') {
			open.set(marker.number, { note: staveNote, line: marker.line });
		} else {
			const from = open.get(marker.number);
			open.delete(marker.number);
			if (!from) {
				continue;
			}
			const pedal = PedalMarking.createSustain([from.note, staveNote]);
			if (from.line) {
				pedal.setType(PedalMarking.type.BRACKET);
			}
			pedals.push(pedal);
		}
	}
	return pedals;
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
		const isGrace = chord.lead.isGrace;
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
			// stems (slurs sit on the notehead side). Grace-to-main slurs default below
			// (under the grace, down to the main notehead) when unspecified. The opening
			// direction forces the arc's sign even when the two endpoints' stems disagree.
			const bulgeUp =
				slur.placement === 'above'
					? true
					: slur.placement === 'below'
						? false
						: isGrace
							? false
							: from.getStemDirection() !== 1;

			// Anchor each endpoint on the bulge side of its noteheads: NEAR_TOP (stem
			// tip) only when that note's stem points toward the bulge, else NEAR_HEAD
			// (outer notehead). This keeps an "above" slur on stem-down notes pinned to
			// the noteheads instead of the stem tips below them. A grace-to-main slur
			// always hugs the noteheads so it runs head-to-head regardless of stems.
			const metric = (note: StaveNote) => {
				if (isGrace) {
					return Curve.Position.NEAR_HEAD;
				}
				const stemUp = note.getStemDirection() === 1;
				return stemUp === bulgeUp
					? Curve.Position.NEAR_TOP
					: Curve.Position.NEAR_HEAD;
			};

			// Lift the control points so the arc midpoint clears the most extreme note
			// in the span and bows well off the noteheads. yShift raises the endpoints
			// off the notes; 0.75*cps.y is the extra rise the cubic bezier gains at its
			// midpoint. The arc height also grows with the slur's width so long slurs get
			// a rounder, taller bow instead of a flat line skimming the noteheads. A grace
			// slur clears the grace cluster's full extent (its flag/beam may hang past the
			// noteheads) but only the main note's notehead, so it tucks under the heads
			// instead of chasing the main note's full stem.
			const extentsOf = (n: StaveNote) => {
				if (isGrace && n === to) {
					const { yTop, yBottom } = n.getNoteHeadBounds();
					return { top: yTop, bottom: yBottom };
				}
				return noteExtents(n);
			};
			const yShift = SLUR_Y_SHIFT;
			const width = Math.abs(to.getTieLeftX() - from.getTieRightX());
			const fromY = extentsOf(from);
			const toY = extentsOf(to);
			const midEnd = bulgeUp
				? (fromY.top + toY.top) / 2
				: (fromY.bottom + toY.bottom) / 2;
			const extreme = bulgeUp
				? Math.min(...span.map((n) => extentsOf(n).top))
				: Math.max(...span.map((n) => extentsOf(n).bottom));
			const need = Math.abs(midEnd - extreme) + SLUR_MARGIN;
			const cpY = Math.max(
				SLUR_MIN_CP_Y,
				width * SLUR_WIDTH_FACTOR,
				(need - yShift) / 0.75,
			);

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
