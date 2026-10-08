import {
	type Chord,
	groupBeamRuns,
	type Measure,
	type Note,
} from '@stringsync/mdom';
import {
	BarNote,
	GhostNote,
	type Stave,
	type StaveNote,
	Stem,
	type StemmableNote,
	type TabNote,
	type TabStave,
} from 'vexflow/core';
import { BAR_STYLE_TYPES } from './barline-translator';
import { isLyricMark } from './lyric-mark';
import type { ScoreReader, StaffVoice } from './score-reader';
import type { MidClefSpec } from './signature-translator';
import type { SpannerBuilder } from './spanner-builder';
import type { PendingStave } from './system-formatter';
import type { TabVoiceTranslator } from './tab-voice-translator';
import type { VoiceTranslator } from './voice-translator';

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
	/** The per-note octave offset the score's <octave-shift> spans imply: every note
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
 * Translates one staff's mdom voices to vexflow voices ready for formatting: the
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
	// Notes in a beam group spanning two staves whose stems point at the other stave (see
	// buildPartBeams). Those stems cross the gap between the staves on purpose, so the stem
	// tip is excluded from the stave spill that sizes that gap: counting it would have the
	// gap widen to "make room" for a stem whose whole job is to reach the other stave,
	// pushing the staves apart by the stem's own length. It is excluded from the note's
	// collision obstacle too, or a dynamic above the lower stave is lifted clear of the
	// stem, past the upper stave. The noteheads still count: a note written far outside its
	// stave (M1's B4 on the bass staff) genuinely needs the clearance.
	private readonly crossStave = new Set<StaveNote>();
	// The ghosts each staff put in for a note its voice drew on another staff (see
	// VoiceTickablesOptions.run), by that note's lead, until the part's tuplets exist.
	private readonly standIns = new Map<Note, GhostNote[]>();
	// The stem direction of every note in a beam group crossing the current part's staves,
	// settled before any of them is built (see planStems).
	private plannedStems = new Map<Note, 'up' | 'down'>();

	constructor(
		private readonly translator: VoiceTranslator,
		private readonly tab: TabVoiceTranslator,
		private readonly reader: ScoreReader,
		private readonly spanners: SpannerBuilder,
		opts: VoiceBuilderOptions,
	) {
		this.softmaxFactor = opts.softmaxFactor;
		this.octaveShiftByNote = opts.octaveShiftByNote;
		this.byLead = opts.byLead;
		this.byTabLead = opts.byTabLead;
	}

	/** Notes in a two-stave beam group whose stems cross the gap, kept out of the stave
	 * spill that sizes the gap between the staves, and their stems out of its obstacles. Filled by buildPartBeams;
	 * the reference is stable. */
	crossStaveNotes(): ReadonlySet<StaveNote> {
		return this.crossStave;
	}

	/*
	 * Settle the stem direction of each beam group in this measure of a part that crosses its
	 * staves, before any stave is built, so each note is built pointing the way the beam
	 * needs (see buildPartBeams for the rule). `staffNumbers` are the part's visible staves,
	 * top first.
	 */
	planStems(measure: Measure, staffNumbers: readonly string[]): void {
		this.plannedStems = new Map();
		const rowOf = new Map(staffNumbers.map((staff, row) => [staff, row]));
		for (const staffNumber of staffNumbers) {
			const staffVoices = this.reader.staffVoices(measure, staffNumber);
			staffVoices.forEach((voice, voiceIndex) => {
				if (voice.beamChords === null) {
					return;
				}
				const defaultStem = voiceStem(voiceIndex, staffVoices.length);
				const chordOf = new Map(voice.beamChords.map((c) => [c.lead, c]));
				for (const group of groupBeamRuns(
					voice.beamChords.map((c) => c.lead),
				)) {
					// Each chord's noteheads per row: a chord split across staves draws a note on each.
					const chords = group.notes.map((lead) => {
						const heads = new Map<number, number>();
						for (const note of chordOf.get(lead)?.notes ?? []) {
							const row = rowOf.get(note.staff);
							if (row !== undefined) {
								heads.set(row, (heads.get(row) ?? 0) + 1);
							}
						}
						return heads;
					});
					const rows = new Set(chords.flatMap((heads) => [...heads.keys()]));
					if (rows.size <= 1) {
						continue;
					}
					const bottom = Math.max(...rows);
					let below = 0;
					for (const heads of chords) {
						let lean = 0;
						for (const [row, count] of heads) {
							lean += row === bottom ? count : -count;
						}
						below += lean > 0 ? 1 : -1;
					}
					const stem = defaultStem ?? (below > 0 ? 'up' : 'down');
					for (const lead of group.notes) {
						for (const note of chordOf.get(lead)?.notes ?? []) {
							this.plannedStems.set(note, stem);
						}
					}
				}
			});
		}
	}

	/*
	 * The beam groups of a voice whose stems vexflow would choose (no written <stem>, no voice
	 * default) and whose notes all sit on this staff: the translator builds them already
	 * pointing the group's way. Groups crossing staves are planStems' instead.
	 */
	private autoBeams(
		voice: StaffVoice,
		defaultStem: 'up' | 'down' | undefined,
	): Note[][] {
		if (voice.beamChords === null || defaultStem) {
			return [];
		}
		// By lead and notehead count, not Chord identity: mdom builds fresh Chords per read.
		const heads = new Map(voice.chords.map((c) => [c.lead, c.notes.length]));
		const whole = new Map(
			voice.beamChords.map((c) => [
				c.lead,
				heads.get(c.lead) === c.notes.length,
			]),
		);
		return groupBeamRuns(voice.beamChords.map((c) => c.lead))
			.map((group) => group.notes)
			.filter((leads) =>
				leads.every((lead) => !lead.stem && whole.get(lead) === true),
			);
	}

	/*
	 * Build a notation staff's notes into vexflow voices. Each mdom voice becomes a
	 * vexflow voice; multiple voices are aligned together and stem apart. Beams and
	 * tuplets are per-voice (positional) and built here; ties and slurs can span
	 * measures, so the caller resolves them once over the whole score (this only
	 * records each chord's StaveNote in the shared `byLead` map).
	 */
	// scry-ignore named-options-last: stave, row, voices and clef are required inputs with no
	// default; the settings a caller can leave out are already in opts, last.
	buildNotes(
		stave: Stave,
		row: number,
		voices: StaffVoice[],
		clef: string,
		opts: BuildNotesOptions,
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
		const stemFor = (index: number) => voiceStem(index, voices.length);
		// A mid-measure divider belongs to the measure, not to a voice, so it goes in the
		// first voice only: a second copy in each of the others would draw the same line
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
			const tickables = this.translator.tickables(chords, clef, {
				endBeat,
				run: voice.run,
				autoBeams: this.autoBeams(voice, stemFor(voiceIndex)),
				stemOf: (lead) => this.plannedStems.get(lead),
				recordStandIn: (lead, ghost) => {
					const ghosts = this.standIns.get(lead);
					if (ghosts) {
						ghosts.push(ghost);
					} else {
						this.standIns.set(lead, [ghost]);
					}
				},
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
		// before formatting. Beam GROUPING happens here, per voice, so each group keeps its
		// voice's default stem direction, but the Beams themselves are constructed once the
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
			// Off the full run, like the beams, and so only on the staff that owns the voice: a
			// triplet whose markers sit on the bass notes still times the notes it crossed up to
			// the treble with. Read off this staff's projection, those notes carry no marker, so
			// they'd keep a plain 16th's ticks and that staff's timeline would overrun the bar.
			tupletChords: voices.flatMap((v) =>
				v.beamChords === null ? [] : [v.beamChords],
			),
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
	 * that landed on a different stave of the same part, and byLead only holds those once
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
		// holding the chord's own lead is reachable through byLead: the other half's chord
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
				const key = splitKey(
					chord.lead.voice,
					this.reader.measureBeatOf(chord.lead),
				);
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
							splitKey(lead.voice, this.reader.measureBeatOf(lead)),
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
					// A cross-staff group takes ONE direction like any other beam: the beam
					// parked past the group's outermost stem tip, every stem reaching it,
					// including the ones a stave away. Written <stem>s are set aside: a group's
					// notes stem toward each other across the gap (bass up, treble down), which asks
					// for a beam kneed between the staves, and that reads worse than one parked
					// outside them. Each chord sides with the stave holding most of its noteheads
					// (a split chord included); when most chords side with the bottom stave the
					// stems rise from it and the beam parks over the top stave, otherwise (a tie
					// too) the beam parks under the bottom one. That keeps the stems short, and it
					// is how other engravers read these groups. The exception is a lower voice on the
					// group's own stave: the beam can't park below a stave another voice already
					// occupies, so the whole group flips up and beams over the TOP stave instead.
					// That case is already decided by `defaultStem` (voices sharing a stave stem
					// apart, first voice up), so honoring it here is the same rule read one level
					// out.
					let stem = defaultStem;
					if (new Set(notes.map((note) => rowOf.get(note))).size > 1) {
						const bottom = Math.max(
							...notes.map((note) => rowOf.get(note) ?? 0),
						);
						const chords = group.notes.map((lead) =>
							(notesByLead.get(lead) ?? [this.byLead.get(lead)]).filter(
								(note): note is StaveNote => note !== undefined,
							),
						);
						stem =
							defaultStem ??
							(sidesBelow(chords, (note) => rowOf.get(note) === bottom)
								? 'up'
								: 'down');
						const direction = stem === 'up' ? Stem.UP : Stem.DOWN;
						const top = Math.min(...notes.map((note) => rowOf.get(note) ?? 0));
						for (const note of notes) {
							// planStems built them this way already; a re-stem would rebuild the heads.
							if (note.getStemDirection() !== direction) {
								note.setStemDirection(direction);
							}
							// Only a stem pointing at the group's other stave crosses the gap; one
							// pointing away (the top stave's stems when the beam is above it) is an
							// ordinary stem and still needs room past its own stave.
							const row = rowOf.get(note);
							if (stem === 'up' ? row !== top : row !== bottom) {
								this.crossStave.add(note);
							}
						}
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
		// A stand-in counts its note's time on another staff, so it takes that note's tuplet
		// too; otherwise it holds a plain 16th where the note it stands for holds a triplet.
		for (const [lead, ghosts] of this.standIns) {
			const tuplet = this.byLead.get(lead)?.getTuplet();
			if (tuplet) {
				for (const ghost of ghosts) {
					ghost.setTuplet(tuplet);
				}
			}
		}
		this.standIns.clear();
		// Voice caches its total ticks and resolution denominator when notes are added.
		// Tuplets just changed those ticks, on any of the part's staves, since a cross-staff
		// tuplet rescales notes another stave drew: rebuild the voices so ordinary beats and
		// tuplet beats share the correct formatter tick contexts.
		if (pending.some((p) => p.tuplets.length > 0)) {
			for (const p of pending) {
				p.vexVoices = p.vexVoices.map((voice) =>
					this.translator.softVoice(voice.getTickables(), this.softmaxFactor),
				);
			}
		}
	}

	/*
	 * Build a tablature staff's notes into vexflow voices of TabNotes (fret numbers on
	 * their strings). Tab notes carry no clef/key, no ghost-note gap filling, and no
	 * beams (the roadmap cases are single-voice fretted lines), so this is a slimmer
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
		// lead -> its tab tickable, held-note ghosts included, unlike byTabLead, which holds
		// only struck TabNotes (buildHammerPulls reads their getPositions()). buildTuplets
		// rescales over this map, so a tuplet that opens on a held (fretless) note still
		// compresses the frets after it instead of letting them drift out from under the beam.
		const byTabTickable = new Map<Note, StemmableNote>();
		const tickablesByVoice = voices.map((voice) => {
			const chords = voice.chords;
			const chordByLead = new Map<Note, Chord>();
			for (const chord of chords) {
				chordByLead.set(chord.lead, chord);
			}
			return this.tab.tickables(chords, tuning, (lead, tickable) => {
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
			});
		});
		// Build (but discard) the tab tuplets: their construction rescales the notes'
		// ticks (Tuplet.attach), which the part's shared formatter needs so a triplet's
		// tab frets stay aligned under their notation notes. The bracket/number is drawn
		// on the notation staff, so these aren't kept for drawing.
		for (const voice of voices) {
			this.spanners.buildTuplets(voice.chords, byTabTickable);
		}
		// Wrap only after tuplets have finalized the ticks, as on the notation path.
		const vexVoices = tickablesByVoice.map((tickables) =>
			this.translator.softVoice(tickables, this.softmaxFactor),
		);
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

// Whether most of a cross-staff group's chords side with its bottom stave, each chord siding
// with the stave holding most of its noteheads (a split chord's halves sit on both). A tie
// sides with the top.
function sidesBelow(
	chords: ReadonlyArray<ReadonlyArray<StaveNote>>,
	isBelow: (note: StaveNote) => boolean,
): boolean {
	let below = 0;
	for (const halves of chords) {
		let lean = 0;
		for (const note of halves) {
			const heads = note.getKeyProps().length;
			lean += isBelow(note) ? heads : -heads;
		}
		below += lean > 0 ? 1 : -1;
	}
	return below > 0;
}

/*
 * Voices sharing a stave stem apart even without explicit <stem>s: the first voice up, the
 * rest down (engraving convention; matches how exporters that do write <stem>s separate
 * voices). A lone voice keeps position-based auto-stems.
 * ponytail: 3+ voices all stem down after the first; alternate up/down if a real
 * 3-voice-per-stave score ever shows up.
 */
function voiceStem(index: number, count: number): 'up' | 'down' | undefined {
	if (count <= 1) {
		return undefined;
	}
	return index === 0 ? 'up' : 'down';
}
