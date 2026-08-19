import { type Chord, groupBeamRuns, type Note } from '@stringsync/mdom';
import {
	BarNote,
	GhostNote,
	type Stave,
	type StaveNote,
	Stem,
	type StemmableNote,
	type TabNote,
	type TabStave,
} from 'vexflow';
import { isLyricMark } from './lyric-mark/lyric-mark';
import {
	BAR_STYLE_TYPES,
	type MidClefSpec,
	type NoteTranslator,
} from './note-translator';
import type { ScoreReader, StaffVoice } from './score-reader';
import type { SpannerBuilder } from './spanner-builder';
import type { PendingStave } from './system-formatter';

/* The measure context one call to VoiceBuilder.buildNotes lays its notes out in. Every one
 * of these is absent from a measure that says nothing about it, so each defaults to the
 * quiet case: no meter to pad out to, a clef at sounding pitch, and no mid-measure
 * dividers or clef changes. */
export interface BuildNotesOptions {
	/** Pad the voices with ghost notes out to this beat, so an underfull measure still
	 * reserves the trailing space the meter asks for. */
	meterFloor?: number;
	/** How far the stave's clef draws its notes from their sounding pitch (a treble-8
	 * clef's octave down), before any <octave-shift> on top. */
	clefOctaveShift?: number;
	/** Mid-measure dividers (see ScoreReader.midBarlinesOf), drawn on the first voice. */
	barlines?: { beat: number; style: string }[];
	/** Mid-measure clef changes (see ScoreReader.midClefsOf), which re-aim every later note. */
	midClefs?: MidClefSpec[];
}

export interface VoiceBuilderOptions {
	/** The formatter's proportional-spacing exponent, shared with the layout's width
	 * planning so measures format at the width they were planned for. */
	softmaxFactor: number;
	/** The per-note octave offset the score's <octave-shift> spans imply — every note
	 * under one draws an octave (or two, or three) off its sounding pitch. Fixed for
	 * the score. */
	octaveShiftByNote: ReadonlyMap<Note, number>;
	/** The pass-wide lead-note registry (see DrawPass.byLead), filled here as each
	 * chord's StaveNote is built. */
	byLead: Map<Note, StaveNote>;
	/** The tablature counterpart of byLead, filled the same way with struck TabNotes. */
	byTabLead: Map<Note, TabNote>;
}

/*
 * Translates one staff's mdom voices into vexflow voices ready for formatting: the
 * notation path (buildNotes), the tablature path (buildTabNotes), and the cross-staff
 * beam construction over a part's pending staves (buildPartBeams). Each build returns
 * the PendingStave record the driver queues for the system's shared format pass, and
 * fills the pass-wide lead-note registries as the notes are built. One instance lives
 * and dies with its DrawPass.
 */
export class VoiceBuilder {
	private readonly softmaxFactor: number;
	private readonly octaveShiftByNote: ReadonlyMap<Note, number>;
	private readonly byLead: Map<Note, StaveNote>;
	private readonly byTabLead: Map<Note, TabNote>;
	// Notes whose beam group spans two staves (see buildPartBeams). Their stems cross the
	// gap between the staves on purpose, so the stem tip is excluded from the stave spill
	// that sizes that gap — counting it would have the gap widen to "make room" for a stem
	// whose whole job is to reach the other stave, pushing the staves apart by the stem's
	// own length. The noteheads still count: a note written far outside its stave (M1's B4
	// on the bass staff) genuinely needs the clearance.
	private readonly crossStave = new Set<StaveNote>();

	constructor(
		private readonly translator: NoteTranslator,
		private readonly reader: ScoreReader,
		private readonly spanners: SpannerBuilder,
		opts: VoiceBuilderOptions,
	) {
		this.softmaxFactor = opts.softmaxFactor;
		this.octaveShiftByNote = opts.octaveShiftByNote;
		this.byLead = opts.byLead;
		this.byTabLead = opts.byTabLead;
	}

	/** Notes whose beam group spans two staves — their cross-gap stems are kept out of
	 * the stave spill that sizes the gap between the staves. Filled by buildPartBeams;
	 * the reference is stable. */
	crossStaveNotes(): ReadonlySet<StaveNote> {
		return this.crossStave;
	}

	/*
	 * Build a notation staff's notes into vexflow voices. Each mdom voice becomes a
	 * vexflow voice; multiple voices are aligned together and stem apart. Beams and
	 * tuplets are per-voice (positional) and built here; ties and slurs can span
	 * measures, so the caller resolves them once over the whole score (this only
	 * records each chord's StaveNote in the shared `byLead` map).
	 */
	buildNotes(
		stave: Stave,
		row: number,
		voices: StaffVoice[],
		clef: string,
		opts: BuildNotesOptions = {},
	): PendingStave {
		const {
			meterFloor = 0,
			clefOctaveShift = 0,
			barlines = [],
			midClefs = [],
		} = opts;
		// How far off its sounding pitch each note is drawn: the clef's own octave change,
		// plus any <octave-shift> (8va/8vb) covering that note.
		const octaveShiftOf = (lead: Note) =>
			clefOctaveShift + (this.octaveShiftByNote.get(lead) ?? 0);
		// Floor the run-out beat at the meter so an underfull measure pads trailing
		// ghosts instead of jamming its last note against the end barline.
		const endBeat = Math.max(this.reader.endBeatOf(voices), meterFloor);
		const staveNotes: StaveNote[] = [];
		const tiedNotes = new Set<StaveNote>();
		const noteChords: Array<{ note: StaveNote; chord: Chord }> = [];
		const graceChords: Array<{ note: StaveNote; chord: Chord }> = [];
		// Voices sharing a stave stem apart even without explicit <stem>s: the first
		// voice up, the rest down (engraving convention; matches how exporters that do
		// write <stem>s separate voices). A lone voice keeps position-based auto-stems.
		// ponytail: 3+ voices all stem down after the first; alternate up/down if a
		// real 3-voice-per-stave score ever shows up.
		const stemFor = (index: number): 'up' | 'down' | undefined =>
			voices.length > 1 ? (index === 0 ? 'up' : 'down') : undefined;
		// A mid-measure divider belongs to the measure, not to a voice, so it goes in the
		// first voice only — a second copy in each of the others would draw the same line
		// again at the same x.
		const midBars: Array<{ note: BarNote; style: string }> = [];
		// How many lyric rows the voices before this one have used. Each voice numbers its own
		// <lyric verse>s from 1, so two voices sharing a stave both claim row 0 and would print
		// their words on top of each other; offsetting by the rows already taken stacks the
		// lower voice's verses beneath the upper voice's instead (see LyricAnnotation).
		let verseOffset = 0;
		const vexVoices = voices.map((voice, voiceIndex) => {
			const chords = voice.chords;
			// lead note -> its chord, so the record callback (which only gets the lead) can pair
			// each StaveNote with the chord whose noteheads it draws (for the hit index).
			const chordByLead = new Map<Note, Chord>();
			for (const chord of chords) {
				chordByLead.set(chord.lead, chord);
			}
			const tickables = this.translator.vexflowVoiceTickables(chords, clef, {
				endBeat,
				record: (lead, note) => {
					this.byLead.set(lead, note);
					staveNotes.push(note);
					if (lead.ties.length > 0) {
						tiedNotes.add(note);
					}
					const chord = chordByLead.get(lead);
					if (chord) {
						(lead.isGrace ? graceChords : noteChords).push({ note, chord });
					}
				},
				octaveShiftOf,
				defaultStem: stemFor(voiceIndex),
				barlines: voiceIndex === 0 ? barlines : [],
				midClefs,
				drawMidClefs: voiceIndex === 0,
			});
			if (voiceIndex === 0) {
				// Built in the same order as `barlines`, so they pair by index.
				const barNotes = tickables.filter((t) => t instanceof BarNote);
				barlines.forEach((barline, index) => {
					const note = barNotes[index];
					// A style vexflow has a type for is drawn by the BarNote itself.
					if (note && BAR_STYLE_TYPES[barline.style] === undefined) {
						midBars.push({ note, style: barline.style });
					}
				});
			}
			if (verseOffset > 0 || voiceIndex < voices.length - 1) {
				let rowsUsed = 0;
				for (const tickable of tickables) {
					for (const modifier of tickable.getModifiers()) {
						if (isLyricMark(modifier)) {
							rowsUsed = Math.max(rowsUsed, modifier.verseIndex + 1);
							modifier.shiftVerses(verseOffset);
						}
					}
				}
				verseOffset += rowsUsed;
			}
			return this.translator.softVoice(tickables, this.softmaxFactor);
		});

		// Spanners that mutate notes (beams drop flags, tuplets rescale ticks) must be built
		// before formatting. Beam GROUPING happens here — per voice, so each group keeps its
		// voice's default stem direction — but the Beams themselves are constructed once the
		// part's other staves exist (see buildPartBeams): a group read off `beamChords` can
		// name notes this staff never drew, and byLead only has them after those staves are
		// built. Everything else about a beam is settled here.
		const beamPlans = voices.flatMap((v, voiceIndex) =>
			v.beamChords === null
				? []
				: [
						{
							// Chord members are transparent to the fold (the <beam> markers hang off
							// the lead), so the lead list is the whole run.
							groups: groupBeamRuns(v.beamChords.map((c) => c.lead)),
							defaultStem: stemFor(voiceIndex),
						},
					],
		);
		return {
			stave,
			row,
			isTab: false,
			vexVoices,
			beams: [],
			beamPlans,
			tuplets: [],
			tupletChords: voices.map((v) => v.chords),
			staveNotes,
			tiedNotes,
			noteChords,
			graceChords,
			tabChords: [],
			graceTabChords: [],
			midBars,
		};
	}

	/*
	 * Build the Beams for the part whose staves make up `pending`, from the groups each
	 * stave recorded in buildNotes.
	 *
	 * Deferred to here rather than done inside buildNotes because a voice's beams are grouped
	 * off its FULL note list (see StaffVoice.beamChords), which on a piano part can name notes
	 * that landed on a different stave of the same part — and byLead only holds those once
	 * that stave has been built. A beam whose notes sit on two staves is exactly the
	 * cross-staff beam, which vexflow draws between them off each note's own stave.
	 *
	 * Still ahead of the system's format pass, which is what beams have to precede (they drop
	 * their notes' flags, changing the width the formatter allocates).
	 */
	buildPartBeams(pending: readonly PendingStave[]): void {
		// StaveNote -> the stave row it was built on, which is what orders a split chord's
		// halves top staff first.
		const rowOf = new Map<StaveNote, number>();
		// A chord split across staves draws as one StaveNote per staff, but only the half
		// holding the chord's own lead is reachable through byLead — the other half's chord
		// leads with a <chord/> member. Index those by voice and onset so their group can pick
		// them up too; without it the split-off half draws a flag beside the beam.
		const splitHalves = new Map<string, StaveNote[]>();
		const splitKey = (voice: string, beat: number | null) => `${voice}@${beat}`;
		for (const p of pending) {
			for (const note of p.staveNotes) {
				rowOf.set(note, p.row);
			}
			for (const { note, chord } of p.noteChords) {
				if (!chord.lead.isChordMember) {
					continue;
				}
				const key = splitKey(chord.lead.voice, chord.measureBeat);
				const halves = splitHalves.get(key);
				if (halves) {
					halves.push(note);
				} else {
					splitHalves.set(key, [note]);
				}
			}
		}
		for (const p of pending) {
			for (const { groups, defaultStem } of p.beamPlans) {
				for (const group of groups) {
					// A split chord's two halves sit at one tick but their stems hang off
					// opposite sides of the noteheads (the upper half stems down off the left
					// edge, the lower half up off the right). Ordering them top staff first so
					// the beam runs left to right through the group keeps its ends on the
					// outermost stems instead of stopping a notehead short.
					const notesByLead = new Map<Note, StaveNote[]>();
					for (const lead of group.notes) {
						const halves = splitHalves.get(
							splitKey(lead.voice, lead.measureBeat),
						);
						const main = this.byLead.get(lead);
						if (halves && main) {
							notesByLead.set(
								lead,
								[main, ...halves].sort(
									(a, b) => (rowOf.get(a) ?? 0) - (rowOf.get(b) ?? 0),
								),
							);
						}
					}
					const notes = group.notes
						.flatMap((lead) => notesByLead.get(lead) ?? [this.byLead.get(lead)])
						.filter((note): note is StaveNote => note !== undefined);
					// A cross-staff group takes ONE direction like any other beam — the beam
					// parked past the group's outermost stem tip, every stem reaching it,
					// including the ones a stave away. Only the direction is decided here:
					// auto-stem reads each note against its own stave, so a group written low in
					// the bass and high in the treble reads as "up" on one staff and "down" on
					// the other and the tie-break lands arbitrarily. Down is the convention for
					// the piano hand-crossing this shows up in, and it keeps the two hands'
					// groups parallel instead of one beaming over the treble and one under
					// the bass. The exception is a lower voice on the group's own stave: the
					// beam can't park below a stave another voice already occupies, so the
					// whole group flips up and beams over the TOP stave instead. That case is
					// already decided by `defaultStem` (voices sharing a stave stem apart, first
					// voice up), so honoring it here is the same rule read one level out.
					// ponytail: down unless a voice sits below. A group that lives mostly in the
					// treble with one low note reads better beamed above even when it's alone;
					// deciding that means comparing the notes' distance from a common reference
					// line rather than each stave's own, which no fixture needs yet.
					let stem = defaultStem;
					if (new Set(notes.map((note) => rowOf.get(note))).size > 1) {
						const direction = defaultStem === 'up' ? Stem.UP : Stem.DOWN;
						for (const note of notes) {
							note.setStemDirection(direction);
							this.crossStave.add(note);
						}
						// Any value here only says "don't auto-stem" — the directions just set
						// are what the beam reads.
						stem = defaultStem ?? 'down';
					}
					p.beams.push(
						...this.spanners.buildBeams(
							[group],
							this.byLead,
							stem,
							notesByLead,
						),
					);
				}
			}
			p.beamPlans.length = 0;
			// After the beams, never before: vexflow's Tuplet omits its bracket when it finds
			// its notes already beamed, and draws a redundant one over the beam otherwise.
			for (const chords of p.tupletChords) {
				p.tuplets.push(...this.spanners.buildTuplets(chords, this.byLead));
			}
			p.tupletChords.length = 0;
		}
	}

	/*
	 * Build a tablature staff's notes into vexflow voices of TabNotes (fret numbers on
	 * their strings). Tab notes carry no clef/key, no ghost-note gap filling, and no
	 * beams — the roadmap cases are single-voice fretted lines — so this is a slimmer
	 * sibling of buildNotes. The bend/vibrato stretching and drawing happen in
	 * SystemFormatter.formatAndDraw, after the part's staves are formatted together. Hammer-ons/
	 * pull-offs span measures, so the caller resolves them once over the whole score
	 * (this only records each chord's TabNote in the shared `byTabLead` map).
	 */
	buildTabNotes(
		stave: TabStave,
		row: number,
		voices: StaffVoice[],
		tuning: number[] | null,
	): PendingStave {
		const tabChords: Array<{ note: TabNote; chord: Chord }> = [];
		const graceTabChords: Array<{ note: TabNote; chord: Chord }> = [];
		// lead -> its tab tickable, held-note ghosts included — unlike byTabLead, which holds
		// only struck TabNotes (buildHammerPulls reads their getPositions()). buildTuplets
		// rescales over this map, so a tuplet that opens on a held (fretless) note still
		// compresses the frets after it instead of letting them drift out from under the beam.
		const byTabTickable = new Map<Note, StemmableNote>();
		const vexVoices = voices.map((voice) => {
			const chords = voice.chords;
			const chordByLead = new Map<Note, Chord>();
			for (const chord of chords) {
				chordByLead.set(chord.lead, chord);
			}
			return this.translator.softVoice(
				this.translator.vexflowTabTickables(
					chords,
					tuning,
					(lead, tickable) => {
						byTabTickable.set(lead, tickable);
						if (tickable instanceof GhostNote) {
							return;
						}
						const tabNote = tickable as TabNote;
						this.byTabLead.set(lead, tabNote);
						const chord = chordByLead.get(lead);
						if (chord) {
							(lead.isGrace ? graceTabChords : tabChords).push({
								note: tabNote,
								chord,
							});
						}
					},
				),
				this.softmaxFactor,
			);
		});
		// Build (but discard) the tab tuplets: their construction rescales the notes'
		// ticks (Tuplet.attach), which the part's shared formatter needs so a triplet's
		// tab frets stay aligned under their notation notes. The bracket/number is drawn
		// on the notation staff, so these aren't kept for drawing.
		for (const voice of voices) {
			this.spanners.buildTuplets(voice.chords, byTabTickable);
		}
		return {
			stave,
			row,
			isTab: true,
			vexVoices,
			beams: [],
			beamPlans: [],
			tuplets: [],
			tupletChords: [],
			staveNotes: [],
			tiedNotes: new Set(),
			noteChords: [],
			graceChords: [],
			tabChords,
			graceTabChords,
			midBars: [],
		};
	}
}
