import {
	Chord,
	type Clef,
	Dashes,
	type Direction,
	type Harmony,
	type Key,
	type Measure,
	type MetronomeNote,
	type Note,
	type Part,
	type PartGroupSpan,
	type Score,
	type Voice as ScoreVoice,
	type Time,
} from '@stringsync/mdom';
import type { ChordFrame } from './chord-diagram-glyph';
import { DEFAULT_TEMPO_BPM, EPSILON } from './constants';
import { DynamicGlyphs } from './dynamic-glyphs';
import type { ModulationNote, TempoModulation } from './metronome-glyph';

/**
 * A metronome mark: the beat-unit's vexflow duration code plus its bpm. The optional
 * fields are the printed variants — augmentation dots on either unit, a second unit for
 * the note-equals-note metric modulation, and the parenthesized form. Only the drawing
 * path reads them; playback needs `bpm` alone.
 */
export type TempoMark = {
	duration: string;
	bpm: number;
	dots?: number;
	duration2?: string | null;
	dots2?: number;
	parenthesis?: boolean;
};

/**
 * A `<sound><swing>` instruction: the on-beat:off-beat duration ratio (`first`:`second`)
 * and `unit`, the swung note value in quarter-note beats — eighth = 0.5, 16th = 0.25. An
 * even `first === second` is straight time.
 */
export type Swing = { first: number; second: number; unit: number };

/*
 * One voice as ONE staff draws it (see ScoreReader.staffVoices). `chords` is the voice
 * restricted to the notes that sit on this staff; `beamChords` is the voice's full,
 * unrestricted chord list on the staff that owns it and null everywhere else, so a beamed run
 * crossing staves is grouped exactly once — off the notes the `<beam>` markers were written
 * on — and the beam then spans both staves instead of breaking at the staff change.
 */
export type StaffVoice = {
	chords: Chord[];
	beamChords: Chord[] | null;
};

/** Which side of the staff a `<direction>` prints on. */
export type Placement = 'above' | 'below';

// A <direction><direction-type><pedal> spanner marker, bound to the lead note it
// anchors. `line` carries the MusicXML line="yes" flag (bracket pedal vs. the
// default "Ped…*" text); it rides on every marker so the stop knows the style.
export type PedalMark = {
	lead: Note;
	type: 'start' | 'stop';
	number: string;
	line: boolean;
};

// A <direction><direction-type><wedge> (hairpin) marker, bound to the lead note it anchors
// the same way a PedalMark is. `crescendo` is carried on every marker of the pair so the
// stop knows which way its hairpin opens; `placement` likewise, so both ends agree on the
// side of the staff.
export type WedgeMark = {
	lead: Note;
	type: 'start' | 'stop';
	number: string;
	crescendo: boolean;
	placement: Placement;
};

/*
 * One <octave-shift> span: the notes it covers, how far to shift them when drawing (signed
 * the way vexflow's octaveShift option reads it — positive draws lower), and the bracket
 * label that goes over or under them ("8" + "va", "15" + "mb", …). See ScoreReader.octaveShiftsOf.
 */
export type OctaveShiftSpan = {
	notes: Note[];
	octaves: number;
	label: string;
	suffix: string;
	above: boolean;
};

/** How a <bracket> terminates at one of its ends. */
export type LineEnd = 'up' | 'down' | 'arrow' | 'none';

/*
 * One <direction-type><bracket> or <dashes> span: the notes it runs between, the side of the
 * staff it prints on, its stroke pattern (null = solid, else a canvas dash array) and the hook
 * each end terminates in. A <dashes> is the degenerate bracket — dashed, hookless — which is
 * why the two share a span type. See ScoreReader.directionLinesOf.
 */
export type DirectionLineSpan = {
	from: Note;
	to: Note;
	above: boolean;
	dash: number[] | null;
	startEnd: LineEnd;
	stopEnd: LineEnd;
};

/* A `line-type` attribute (<bracket>, <slur>, …) -> the canvas dash array to stroke it
 * with; null is a solid line.
 * ponytail: 'wavy' falls back to solid — a wavy line needs the SMuFL squiggle run that
 * VibratoBracket draws for trills, not a dash pattern. No fixture asks for one. */
export const LINE_TYPE_DASH: Record<string, number[] | null> = {
	solid: null,
	dashed: [5, 5],
	dotted: [1, 3],
	wavy: null,
};

// MusicXML <root-alter>/<bass-alter> semitones -> the printed accidental sign, using the
// real Unicode music symbols (♯ ♭ ♮). 0 prints an explicit natural — rare in a root, but
// MusicXML carries it when the chart wants the sign drawn. An absent <root-alter> maps to
// nothing (no sign), so plain roots stay bare.
const HARMONY_ALTER: Record<string, string> = { '1': '♯', '-1': '♭', '0': '♮' };

// Fallback suffix per <kind> value, for the exporters that omit the text attribute —
// without it a D power chord prints as a bare "D", which reads as a major triad.
// An empty string is the right answer for 'major' and 'none' (the bare root).
const HARMONY_KIND_SUFFIX: Record<string, string> = {
	major: '',
	minor: 'm',
	augmented: '+',
	diminished: 'dim',
	dominant: '7',
	'major-seventh': 'maj7',
	'minor-seventh': 'm7',
	'diminished-seventh': 'dim7',
	'augmented-seventh': '+7',
	'half-diminished': 'm7♭5',
	'major-minor': 'mMaj7',
	'major-sixth': '6',
	'minor-sixth': 'm6',
	'dominant-ninth': '9',
	'major-ninth': 'maj9',
	'minor-ninth': 'm9',
	'dominant-11th': '11',
	'major-11th': 'maj11',
	'minor-11th': 'm11',
	'dominant-13th': '13',
	'major-13th': 'maj13',
	'minor-13th': 'm13',
	'suspended-second': 'sus2',
	'suspended-fourth': 'sus4',
	Neapolitan: 'N',
	Italian: 'It',
	French: 'Fr',
	German: 'Ger',
	pedal: 'ped',
	power: '5',
	Tristan: 'Tr',
	other: '',
	none: '',
};

/*
 * A <figured-bass><figure>'s <prefix>/<suffix> value -> the sign printed beside its numeral,
 * in the same real Unicode accidentals HARMONY_ALTER uses so the two faces match.
 * ponytail: 'slash'/'back-slash' ask for a stroke THROUGH the numeral (the continuo sign for a
 * raised third) and print as a trailing solidus instead — striking a glyph needs a drawn line
 * over measured text, not a character, and SMuFL's pre-slashed figbass glyphs exist only for a
 * few specific numerals (not lilypond_74a's "127"). Draw the stroke if a real continuo score
 * makes the difference matter.
 */
const FIGURE_SIGN: Record<string, string> = {
	sharp: '♯',
	flat: '♭',
	natural: '♮',
	'double-sharp': '𝄪',
	'sharp-sharp': '♯♯',
	'flat-flat': '𝄫',
	slash: '/',
	'back-slash': '\\',
};

/*
 * Reads score semantics straight off the mdom: staff voice selection, meter lengths,
 * and the direction/harmony markers a measure carries. Stateless — the layout
 * (measuring) and draw passes must read identically, so the predicates live here.
 */

/* Which kinds of stave a render shows, from Config.showTabs/showNotation. Both are asked
 * together everywhere a part's stave rows are derived, so they travel as one value. */
/** A `<part-group>` span: the run of parts it brackets, and the connector to draw. */
export type PartGroup = {
	/** Index into the rendered `parts` array of the group's first and last part. */
	fromPart: number;
	toPart: number;
	symbol: 'brace' | 'bracket' | 'line';
	/** Nesting depth — 0 is outermost, and each level draws further left of the system. */
	depth: number;
	/** The group's `<group-name>`, printed left of its symbol; null when it declares none. */
	name: string | null;
};

export type MeasureRepeat = {
	/** A left `<repeat direction="forward"/>`: the measure opens a repeat block. */
	repeatBegin: boolean;
	/** A right `<repeat direction="backward"/>`: the measure closes one. */
	repeatEnd: boolean;
	/** How many times a backward repeat plays the block; null when there is no repeat end. */
	repeatTimes: number | null;
	/** The ending (volta) run covering this measure, or null when it's outside one. */
	ending: MeasureEnding | null;
};

export type MeasureEnding = {
	/** The raw `<ending number>` — a list or range like `"1"`, `"1,2"`, `"1-3"`. */
	number: string;
	/** Whether the run starts here (its bracket's left hook). */
	first: boolean;
	/** Whether the run ends here (its bracket's right hook, and where playback jumps). */
	last: boolean;
	/** The bracket stays open on the right, with no down hook. */
	open: boolean;
};

type BarlineRead = {
	repeatBegin: boolean;
	repeatEnd: boolean;
	repeatTimes: number | null;
	started: string | null;
	closed: 'stop' | 'discontinue' | null;
};

export class ScoreReader {
	// Only to answer whether a dynamic marking can be drawn as music (see dynamicsOf). The
	// spelling itself belongs to the draw pass, not to a read.
	constructor(private readonly dynamics = new DynamicGlyphs()) {}

	/*
	 * One staff's renderable content from a measure's voices — see {@link StaffVoice}.
	 *
	 * A voice is PROJECTED onto the staff rather than assigned to one: each chord keeps only
	 * the notes whose own `<staff>` names this staff. That is what makes cross-staff writing
	 * work — a piano voice that runs up out of the bass staff mid-beam has its upper notes
	 * drawn on the treble staff, where the composer put them, instead of climbing out of the
	 * bass staff on five ledger lines. A chord split across both staves lands as two partial
	 * chords, one per staff, sharing an onset.
	 *
	 * A voice with nothing on this staff drops out entirely (an empty voice would crash the
	 * formatter), and one that never leaves its own staff projects to itself unchanged — the
	 * single-staff case is untouched.
	 *
	 * The layout (measuring) and draw passes must select identically, so the projection lives
	 * here.
	 */
	staffVoices(voices: ScoreVoice[], staffNumber: string): StaffVoice[] {
		const out: StaffVoice[] = [];
		for (const voice of voices) {
			const chords: Chord[] = [];
			for (const chord of voice.chords) {
				const notes = chord.notes.filter((note) => note.staff === staffNumber);
				// Keep the original Chord identity when the whole chord stays — it's the key
				// the hit index maps noteheads back through.
				if (notes.length === chord.notes.length) {
					chords.push(chord);
				} else if (notes.length > 0) {
					chords.push(new Chord(notes));
				}
			}
			if (chords.length > 0) {
				out.push({
					chords,
					// mdom sets a voice's staff from its FIRST note, so exactly one staff owns
					// each voice's beams — the run is grouped once and spans whatever staves its
					// notes landed on.
					beamChords: voice.staff === staffNumber ? voice.chords : null,
				});
			}
		}
		return out;
	}

	/*
	 * What a `<key>` prints, as an equality key — the string to compare against the previous
	 * measure's to spot a mid-piece key change, and the test for "does this staff draw a
	 * signature at all" (null when it draws nothing).
	 *
	 * A traditional key is identified by its tonic. A non-traditional one (<key-step>/
	 * <key-alter> instead of <fifths>) has no tonic, so it's identified by the alterations it
	 * lists, read positionally the way the drawing side reads them.
	 */
	keyIdentity(key: Key | null): string | null {
		if (key?.rootNote) {
			return key.rootNote;
		}
		const alterations = key?.alterations ?? [];
		if (alterations.length === 0) {
			return null;
		}
		return alterations.map((a) => `${a.step}${a.alter}`).join(' ');
	}

	/*
	 * The beat length a measure's width is floored at (see meterBeats), except for a
	 * <measure implicit="yes"> — a pickup bar, or the back half of a measure split across a
	 * system break — which floors at 0 so it is sized to the music it actually holds. An
	 * implicit measure is short BY DECLARATION, not underfull by accident, so padding it out
	 * to the meter would draw a pickup as wide as a full bar.
	 */
	meterFloor(measure: Measure, staffNumber?: string): number {
		return measure.isImplicit
			? 0
			: this.meterBeats(measure.getTime(staffNumber));
	}

	/*
	 * A meter's length in quarter-note beats (4/4 -> 4, 6/8 -> 3, 2/2 -> 4). 0 when
	 * unmetered or absent, so callers fall back to the content's own end. Flooring a
	 * measure's endBeat at this pads an underfull measure (e.g. a final fragment) with
	 * trailing ghosts, reserving the missing time as blank space instead of letting the
	 * formatter justify the last note flush against the end barline.
	 */
	meterBeats(time: Time | null): number {
		if (!time || time.isSenzaMisura) {
			return 0;
		}
		let total = 0;
		// A composite meter lists several beats/beat-type pairs (2/4 + 3/8); an additive one
		// writes a summed numerator in a single pair ("3+2" over 8). Both add up to the bar.
		for (const component of time.components) {
			const beatType = Number(component.beatType);
			if (!beatType) {
				return 0;
			}
			for (const term of component.beats.split('+')) {
				const beats = Number(term);
				if (!beats) {
					return 0;
				}
				total += (beats / beatType) * 4;
			}
		}
		return total;
	}

	/*
	 * A measure's <barline location="middle"> dividers: the beat each one falls on and its
	 * <bar-style>. These are the barlines that land off the measure edge — a double bar or a
	 * dotted divider mid-bar — which MusicXML writes between two notes rather than at an
	 * edge. Left/right barlines are the measure's own edges and are read elsewhere.
	 */
	midBarlinesOf(measure: Measure): { beat: number; style: string }[] {
		return measure.barlines
			.filter((barline) => barline.location === 'middle')
			.map((barline) => ({
				beat: barline.measureBeat ?? 0,
				style: barline.barStyle ?? 'regular',
			}));
	}

	/*
	 * A measure's mid-measure <clef> changes for one staff — Measure.clefChanges, minus any
	 * landing at beat 0.
	 * ponytail: a change landing at beat 0 is dropped rather than drawn inline — it is the
	 * staff's OPENING clef. Measure.getClef doesn't look past the measure's first note, so
	 * such a staff still opens in the previous clef and switches at the next barline
	 * (navigation.musicxml's bass staff documents exactly that). Closing that gap means
	 * teaching the STAVE clef to see past the first note, not drawing a second glyph here.
	 */
	midClefsOf(
		measure: Measure,
		staffNumber = '1',
	): { beat: number; clef: Clef }[] {
		return measure
			.clefChanges(staffNumber)
			.filter((change) => change.beat > EPSILON);
	}

	/*
	 * The score's <measure-style><multiple-rest> runs: each lead measure's index mapped to how
	 * many measures it consolidates, plus the indexes those runs swallow. A multirest is drawn
	 * as ONE wide measure holding the thick horizontal bar, so the swallowed measures are given
	 * no box by the layout planner and the draw pass skips them (the document keeps them, so
	 * playback still counts the full rest).
	 *
	 * A run only collapses when EVERY part (and every staff within it — see multiRestCountOf)
	 * declares the same count at the same measure. Parts are laid out in one grid of measure
	 * columns, so collapsing three bars of a resting flute against three played bars of a violin
	 * would shear the two apart.
	 */
	multiRestsOf(parts: Part[]): {
		leads: Map<number, number>;
		hidden: Set<number>;
	} {
		const leads = new Map<number, number>();
		const hidden = new Set<number>();
		const measureCount = Math.max(
			0,
			...parts.map((part) => part.measures.length),
		);
		for (let m = 0; m < measureCount; m++) {
			if (hidden.has(m)) {
				continue;
			}
			const count = this.multiRestCountOf(parts[0]?.measures[m]);
			if (
				!count ||
				count < 2 ||
				!parts.every(
					(part) => this.multiRestCountOf(part.measures[m]) === count,
				)
			) {
				continue;
			}
			leads.set(m, count);
			for (let swallowed = m + 1; swallowed < m + count; swallowed++) {
				hidden.add(swallowed);
			}
		}
		return { leads, hidden };
	}

	/*
	 * The <clef> in effect at the END of a measure for one staff: its last mid-measure change
	 * if it has one, else the clef it opened with. This is what the NEXT measure compares
	 * against to decide whether to reprint a clef — a change already stated inside a measure
	 * (or as its courtesy clef) must not be stated again at the next barline.
	 */
	clefAtEndOf(measure: Measure | undefined, staffNumber = '1'): Clef | null {
		if (!measure) {
			return null;
		}
		// Not Measure.clefAtEnd: that counts a change landing at beat 0, which midClefsOf
		// deliberately drops. Counting it here would tell the next measure the clef is already
		// in effect, so nothing would ever print it and the staff would silently stay in the
		// old clef (navigation.musicxml's bass staff). The two have to agree.
		return (
			this.midClefsOf(measure, staffNumber).at(-1)?.clef ??
			measure.getClef(staffNumber)
		);
	}

	/*
	 * A measure's metronome mark from the first <direction> that carries a
	 * <metronome>, or null when none does. MusicXML's <beat-unit> names ('quarter',
	 * 'eighth', 'half', ...) already match StaveTempo's duration codes. bpm comes from
	 * <per-minute>, falling back to the <sound tempo>, then to 120 — so a metronome
	 * directive without a number still prints "= 120".
	 *
	 * A SECOND <beat-unit> is the metric-modulation form ("dotted quarter = dotted half"),
	 * which states a relation rather than a rate and so carries no <per-minute>; bpm keeps
	 * its fallback for the playback path, which has no way to read a relation.
	 *
	 * A <metronome> written in the <metronome-note> form carries no <beat-unit> at all and is
	 * skipped here — that shape is a note-group relation, read separately by
	 * {@link modulationOf} and drawn beside this mark.
	 */
	tempoOf(measure: Measure): TempoMark | null {
		for (const direction of measure.directions) {
			for (const metronome of direction.metronomes) {
				const [first, second] = metronome.beatUnits;
				if (!first) {
					continue;
				}
				return {
					duration: first.type,
					dots: first.dots,
					bpm:
						Number(metronome.perMinute ?? direction.soundTempo) ||
						DEFAULT_TEMPO_BPM,
					duration2: second?.type ?? null,
					dots2: second?.dots ?? 0,
					parenthesis: metronome.parentheses,
				};
			}
		}
		return null;
	}

	/*
	 * A measure's metric modulation: the first <metronome> written in the <metronome-note>
	 * form, or null when none is. This is the note-GROUP shape — "two beamed eighths = a
	 * quarter-eighth triplet", i.e. a swing marking — which states a relation between two
	 * rhythms rather than a rate, and which the <beat-unit> form {@link tempoOf} reads cannot
	 * express.
	 *
	 * The two live side by side: an exporter routinely writes the rate in one <direction-type>
	 * and this in the next, of the same <direction>, so a measure can have both and both print.
	 *
	 * It is notation only. Nothing here reaches playback — a <sound><swing> is what makes the
	 * timing swing (see {@link swingOf}), and a score can carry this mark without one.
	 */
	modulationOf(measure: Measure): TempoModulation | null {
		for (const direction of measure.directions) {
			for (const metronome of direction.metronomes) {
				// <metronome-relation> splits the notes into the two sides of the equation. With
				// no relation there is nothing to equate, so the mark states nothing and is skipped.
				const relation = metronome.relation;
				if (!relation) {
					continue;
				}
				const left = this.modulationNotesOf(relation.left);
				const right = this.modulationNotesOf(relation.right);
				if (left.length === 0 || right.length === 0) {
					continue;
				}
				return { left, right, parenthesis: metronome.parentheses };
			}
		}
		return null;
	}

	/*
	 * A measure's PLAYBACK tempo, in quarter notes per minute (as a TempoMark). The
	 * visible <metronome> mark wins (via {@link tempoOf}); otherwise a <sound tempo>
	 * drives timing — co-located in a <direction> or standalone as a direct measure
	 * child (MusicXML's tempo is already quarter-note BPM). null means no mark here,
	 * so the previous tempo carries forward.
	 *
	 * <sound tempo> is playback-only: it engraves no metronome mark, so the visual
	 * path (draw-pass / layout-planner) stays on {@link tempoOf} and never sees it.
	 */
	playbackTempoOf(measure: Measure): TempoMark | null {
		const metronome = this.tempoOf(measure);
		if (metronome) {
			return metronome;
		}
		for (const sound of measure.sounds) {
			if (sound.tempo) {
				return { duration: 'quarter', bpm: sound.tempo };
			}
		}
		return null;
	}

	/*
	 * A measure's <sound><swing> performance instruction, or null when it carries none — in
	 * which case the swing already in force carries forward, like tempo. This is the ONLY
	 * thing that makes playback swing; a <metronome> "two eighths = triplet quarter-eighth"
	 * mark states the same intent to a human reader but carries no timing (see
	 * {@link modulationOf}), so a score with the mark and no <swing> plays straight.
	 *
	 * <straight/> is the explicit "stop swinging" form; mdom normalizes it to an even 1:1 so
	 * that it cancels a carried swing rather than being mistaken for "no instruction here".
	 */
	swingOf(measure: Measure): Swing | null {
		for (const sound of measure.sounds) {
			if (sound.swing) {
				return sound.swing;
			}
		}
		return null;
	}

	/*
	 * A measure's <direction><direction-type><words> text directives (e.g. "ritardando",
	 * "dolce"), in document order. These are free-text expressions printed above the stave.
	 * `staffNumber` is the direction's <staff> ('1' when absent), so a multi-staff part
	 * prints each directive over the staff it was written for instead of piling every one
	 * of them onto the part's top staff.
	 * `lead` is the note the directive applies to — the next non-chord note after it, the
	 * same binding a pedal start uses — so per-note directives (guitar p-i-m-a fingering,
	 * picking marks) print over their own note instead of stacking on the measure's first.
	 * null when the direction trails the measure's last note.
	 * `placement` is the direction's placement attribute: 'below' prints under the staff (the
	 * convention for piano expression marks), anything else — including an absent attribute —
	 * keeps the above-staff default.
	 * ponytail: font-style attributes still ignored — every words direction prints in italics;
	 * add a style field if a fixture needs upright words.
	 */
	wordsOf(measure: Measure): {
		text: string;
		staffNumber: string;
		lead: Note | null;
		placement: Placement;
	}[] {
		return measure.directions.flatMap((d) => {
			const staffNumber = d.staff;
			const lead = d.nextNote;
			const placement = this.placementOf(d);
			return d.words
				.filter(Boolean)
				.map((text) => ({ text, staffNumber, lead, placement }));
		});
	}

	/*
	 * A measure's <direction><direction-type><dynamics> markings (p, mf, sfz, …), in
	 * document order. MusicXML names the marking by the TAG — <dynamics><sfz/> — with
	 * <other-dynamics> carrying free text for anything outside the vocabulary, so the tag
	 * name is the text to print.
	 * `glyph` says the marking is spelled entirely out of the SMuFL dynamic letters and so
	 * draws in the notation font; an <other-dynamics> (or any tag with a stray letter)
	 * falls back to plain italic text.
	 * `staffNumber` and `lead` bind it the same way {@link wordsOf} binds a directive.
	 * Dynamics engrave BELOW the staff by convention, so that's the placement default here
	 * — an explicit placement="above" still wins.
	 */
	dynamicsOf(measure: Measure): {
		text: string;
		glyph: boolean;
		staffNumber: string;
		lead: Note | null;
		placement: Placement;
	}[] {
		return measure.directions.flatMap((d) => {
			const staffNumber = d.staff;
			const lead = d.nextNote;
			const placement = this.placementOf(d, 'below');
			return d.dynamics
				.flatMap((dynamics) => dynamics.marks)
				.filter(Boolean)
				.map((text) => ({
					text,
					glyph: this.dynamics.canSpell(text),
					staffNumber,
					lead,
					placement,
				}));
		});
	}

	/*
	 * A measure's <direction><direction-type><rehearsal> section headers (e.g. "A", "B",
	 * "Chorus"), in document order. These are the boxed letters a player navigates a chart
	 * by, printed at the measure's left edge above the system's top staff.
	 * ponytail: the <rehearsal> enclosure/font attributes are ignored — every mark prints
	 * boxed in the default style; add an enclosure field if a fixture needs a circle or a
	 * bare letter.
	 */
	rehearsalsOf(measure: Measure): string[] {
		return measure.directions.flatMap((d) =>
			d.rehearsals.map((rehearsal) => rehearsal.text).filter(Boolean),
		);
	}

	/*
	 * A measure's `<figured-bass>` stacks — the numerals a continuo player reads under the bass
	 * line — each bound to the note it sits under (the next non-`<chord/>` note, the binding a
	 * `<harmony>` uses). One string per `<figure>`, top of the stack first, each its
	 * `<prefix>` sign + `<figure-number>` + `<suffix>` sign; `parentheses="yes"` on the
	 * `<figured-bass>` wraps every figure of that stack.
	 *
	 * A stack with no printable figure at all (the empty `<figured-bass>` that lilypond_74a
	 * writes on purpose to see what breaks) is dropped rather than reserving a blank row.
	 * ponytail: `<extend>` is ignored — it draws the dash that carries a figure over the notes
	 * that follow it, and neither fixture in tmp/ writes one (74a says so in its own
	 * description). It would hang off this same lead note when one does.
	 */
	figuredBassesOf(measure: Measure): { lead: Note; figures: string[] }[] {
		const out: { lead: Note; figures: string[] }[] = [];
		for (const stack of measure.figuredBasses) {
			const lead = stack.nextNote;
			if (!lead) {
				continue;
			}
			const figures = stack.figures
				.map((figure) => {
					const text =
						(FIGURE_SIGN[figure.prefix ?? ''] ?? '') +
						(figure.number ?? '') +
						(FIGURE_SIGN[figure.suffix ?? ''] ?? '');
					return text && stack.parentheses ? `(${text})` : text;
				})
				.filter(Boolean);
			if (figures.length > 0) {
				out.push({ lead, figures });
			}
		}
		return out;
	}

	/*
	 * A measure's navigation signs — <direction><direction-type><segno/> and <coda/> — in
	 * document order. These are the landmarks a D.S./D.C. jumps to. The words that drive them
	 * ("D.S. al Coda", "Fine") are ordinary <words> and already print via {@link wordsOf}; only
	 * the two GLYPHS are here.
	 * ponytail: the sign's own placement/x attributes are ignored — MusicXML lets a segno be
	 * offset anywhere, but every one in tmp/ sits at its measure's start, which is where a
	 * player looks for it.
	 */
	navigationsOf(measure: Measure): Array<'segno' | 'coda'> {
		return measure.directions.flatMap((d) => d.navigations);
	}

	/*
	 * A measure's pedal markers, in document order: a "start" binds to the next note
	 * (the pedal goes down there), a "stop" to the previous note (the last note still
	 * held). Directions sit between notes, so walk the children tracking the last lead
	 * and any starts pending a note.
	 * ponytail: only start/stop handled — change/continue/sostenuto/discontinue
	 * pedal directions are ignored; add them if a fixture needs a re-pedal or sostenuto.
	 */
	pedalsOf(measure: Measure): PedalMark[] {
		const out: PedalMark[] = [];
		for (const direction of measure.directions) {
			for (const pedal of direction.pedals) {
				const type = pedal.pedalType;
				if (type !== 'start' && type !== 'stop') {
					continue;
				}
				const lead =
					type === 'start' ? direction.nextNote : direction.previousNote;
				if (lead) {
					out.push({ lead, type, number: pedal.number, line: pedal.line });
				}
			}
		}
		return out;
	}

	/*
	 * A measure's wedge (hairpin) markers, in document order. A "crescendo"/"diminuendo"
	 * opens on the note that follows it. A "stop" sits at the moment the wedge finishes, so
	 * it closes on the note that FOLLOWS it too — unlike a pedal stop, which releases on the
	 * last note still held. An exporter that trails the stop after a measure's last note
	 * leaves no next note, so that case falls back to the previous one.
	 * The opening marker's type decides the direction, so a stop inherits it from its
	 * partner; a stop whose partner is missing (a malformed or sliced span) is dropped by
	 * the builder, not here.
	 * Hairpins engrave BELOW the staff by convention, so that's the placement default — an
	 * explicit placement="above" still wins.
	 * ponytail: a "continue" marker is ignored — it only re-states an open wedge mid-span.
	 */
	wedgesOf(measure: Measure): WedgeMark[] {
		const out: WedgeMark[] = [];
		for (const direction of measure.directions) {
			for (const wedge of direction.wedges) {
				const wedgeType = wedge.wedgeType;
				if (wedgeType === 'continue') {
					continue;
				}
				const type = wedgeType === 'stop' ? 'stop' : 'start';
				const lead =
					direction.nextNote ??
					(type === 'stop' ? direction.previousNote : null);
				if (!lead) {
					continue;
				}
				// A stop carries no direction of its own; read it off the marker that opened
				// the pair. Falling back to crescendo keeps a half-open span drawable.
				const opener =
					type === 'start'
						? wedgeType
						: (wedge.members.find((m) => m.wedgeType !== 'stop')?.wedgeType ??
							'crescendo');
				out.push({
					lead,
					type,
					number: wedge.number,
					crescendo: opener === 'crescendo',
					placement: this.placementOf(direction, 'below'),
				});
			}
		}
		return out;
	}

	/*
	 * A part's <direction><octave-shift> spans (the 8va/8vb/15ma/15mb ottava brackets).
	 *
	 * MusicXML carries SOUNDING pitch, so an octave shift is a printing instruction: type="down"
	 * means print the notes an octave (or two, or three) LOWER than they sound and label the
	 * passage 8va, and type="up" is the mirror. `octaves` is signed the way vexflow's own
	 * octaveShift option reads it — positive draws lower — so it can be handed straight to the
	 * note builder.
	 *
	 * A start binds to the note that follows it and a stop to the note before it, and everything
	 * between them in document order is shifted. Paired by `number` across the part, so a span
	 * can cross barlines.
	 * ponytail: a start with no note after it in its own measure (or a stop with none before it)
	 * is dropped rather than reaching into the neighbouring measure, and a span that wraps onto a
	 * later system draws one bracket running right-to-left. Both need a fixture first.
	 */
	octaveShiftsOf(part: Part): OctaveShiftSpan[] {
		const notes = part.measures.flatMap((measure) => measure.notes);
		const indexOf = new Map(notes.map((note, index) => [note, index]));
		const spans: OctaveShiftSpan[] = [];
		const open = new Map<string, { from: Note; size: number; down: boolean }>();
		for (const measure of part.measures) {
			for (const direction of measure.directions) {
				for (const marker of direction.octaveShifts) {
					const type = marker.octaveShiftType;
					if (type === 'up' || type === 'down') {
						const from = direction.nextNote;
						if (from) {
							open.set(marker.number, {
								from,
								size: marker.size,
								down: type === 'down',
							});
						}
						continue;
					}
					if (type !== 'stop') {
						continue;
					}
					const opened = open.get(marker.number);
					open.delete(marker.number);
					const to = direction.previousNote;
					if (!opened || !to) {
						continue;
					}
					const first = indexOf.get(opened.from);
					const last = indexOf.get(to);
					if (first === undefined || last === undefined) {
						continue;
					}
					// <octave-shift size> is an interval (8, 15, 22), i.e. 1, 2 or 3 octaves.
					const octaves = Math.max(1, Math.round((opened.size - 1) / 7));
					// "8va"/"8vb" for one octave; two or three take the -ma/-mb suffixes.
					let suffix: string;
					if (octaves === 1) {
						suffix = opened.down ? 'va' : 'vb';
					} else {
						suffix = opened.down ? 'ma' : 'mb';
					}
					spans.push({
						notes: notes.slice(first, last + 1),
						octaves: opened.down ? octaves : -octaves,
						label: String(opened.size),
						suffix,
						above: opened.down,
					});
				}
			}
		}
		return spans;
	}

	/*
	 * A part's <direction-type><bracket> and <dashes> spans — the phrase/analysis brackets and
	 * the dashed line that trails a "cresc." or "rit.".
	 *
	 * Paired by type and `number` across the whole part, so a span can cross barlines. Both ends
	 * bind to the note that FOLLOWS the direction (the wedge convention, not the pedal one: a
	 * bracket's stop marks the moment the passage ends, and MusicXML writes it before the last
	 * note it covers). A stop trailing the measure's last note has no next note, so it falls
	 * back to the previous one.
	 *
	 * `line-end` belongs to the end it is written on: the start element's names the opening
	 * hook, the stop element's the closing hook. A <dashes> carries neither and is a plain
	 * dashed line.
	 * ponytail: a span whose start has no note after it, or that never stops, is dropped. One
	 * wrapping onto a later system is dropped by the drawing side rather than split the way
	 * buildTies splits a tie — neither needs handling until a fixture has one.
	 */
	directionLinesOf(part: Part): DirectionLineSpan[] {
		const spans: DirectionLineSpan[] = [];
		const open = new Map<
			string,
			{ from: Note; above: boolean; dash: number[] | null; startEnd: LineEnd }
		>();
		for (const measure of part.measures) {
			for (const direction of measure.directions) {
				for (const mark of [...direction.brackets, ...direction.dashes]) {
					// A <dashes> is the degenerate bracket: dashed, hookless, and typed
					// separately by mdom, so flatten the two into one shape here.
					const spec =
						mark instanceof Dashes
							? {
									kind: 'dashes',
									type: mark.dashesType,
									lineEnd: 'none' as LineEnd,
									dash: [5, 5] as number[] | null,
								}
							: {
									kind: 'bracket',
									type: mark.bracketType,
									lineEnd: mark.lineEnd,
									dash: LINE_TYPE_DASH[mark.lineType ?? 'solid'] ?? null,
								};
					const key = `${spec.kind}:${mark.number}`;
					if (spec.type === 'stop') {
						const opened = open.get(key);
						open.delete(key);
						const to = direction.nextNote ?? direction.previousNote;
						if (opened && to && opened.from !== to) {
							spans.push({ ...opened, to, stopEnd: spec.lineEnd });
						}
						continue;
					}
					// 'continue' only re-states an open span, so only a 'start' opens one.
					if (spec.type !== 'start') {
						continue;
					}
					const from = direction.nextNote;
					if (!from) {
						continue;
					}
					open.set(key, {
						from,
						above: this.placementOf(direction) === 'above',
						dash: spec.dash,
						startEnd: spec.lineEnd,
					});
				}
			}
		}
		return spans;
	}

	/*
	 * Each <harmony> in a measure paired with the lead note it sits above. A <harmony>
	 * applies to the note that follows it, resolved by Harmony.nextNote (the next
	 * non-<chord/> note). `frame` is the chord-diagram spec when the harmony carries a
	 * <frame>, else null. `source` is the Harmony element itself, kept for provenance.
	 *
	 * Deduplicated on (beat, text, frame): a <harmony> belongs to the part, but Guitar Pro
	 * repeats an identical one after every <backup> — once per voice — and drawing each
	 * copy stacks the same chord symbol/diagram on itself. The same chord genuinely
	 * restruck later in the measure lands on a different beat, so it survives.
	 */
	harmoniesOf(measure: Measure): {
		lead: Note;
		text: string;
		frame: ChordFrame | null;
		source: Harmony;
	}[] {
		const harmonies: {
			lead: Note;
			text: string;
			frame: ChordFrame | null;
			source: Harmony;
		}[] = [];
		const seen = new Set<string>();
		for (const harmony of measure.harmonies) {
			const lead = harmony.nextNote;
			if (!lead) {
				continue;
			}
			const text = this.harmonyText(harmony);
			const frame = this.frameOf(harmony);
			if (!text && !frame) {
				continue;
			}
			const key = `${lead.measureBeat ?? 0}|${text}|${JSON.stringify(frame)}`;
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			harmonies.push({ lead, text, frame, source: harmony });
		}
		return harmonies;
	}

	/*
	 * The beat a measure's voices run out to: the latest onset+duration across them.
	 * Voices that end before this (e.g. one silent on the final beat via <forward>)
	 * are padded out to it so every voice spans the same range — see the trailing
	 * fill in VoiceTranslator.tickables.
	 */
	endBeatOf(voices: { chords: Chord[] }[]): number {
		let end = 0;
		for (const { chords } of voices) {
			const last = chords.at(-1);
			if (last) {
				end = Math.max(end, (last.measureBeat ?? 0) + (last.lead.beats ?? 0));
			}
		}
		return end;
	}

	/*
	 * The part boundaries a measure's barlines must NOT run across: entry `i` means the barline
	 * between rendered part `i` and part `i + 1` stops instead of continuing down.
	 *
	 * A barline runs through the staves of ONE part — that is what a part's brace/bracket means —
	 * and stops at every part boundary, which is how an engraver separates one instrument from the
	 * next (MuseScore draws this score exactly so: the singer's barline stops, the guitar's runs
	 * through its notation and TAB together). A `<part-group>` is what joins parts back up, and it
	 * does so unless it declares `<group-barline>no</group-barline>` — MusicXML defines no default
	 * for an absent one, so a declared group is read as asking for common barlines.
	 *
	 * A nested pair that disagrees resolves to "any 'no' covering the boundary breaks it", since
	 * the inner group is the one closest to the staves — hence the two passes rather than deleting
	 * from a running set, which would let an outer 'yes' erase an inner 'no'.
	 */
	barlineBreaks(score: Score): Set<number> {
		const joined = new Set<number>();
		const broken = new Set<number>();
		for (const group of score.partGroups) {
			for (let at = group.fromPartIndex; at < group.toPartIndex; at++) {
				(group.barline === 'no' ? broken : joined).add(at);
			}
		}
		const breaks = new Set<number>();
		for (let at = 0; at < score.parts.length - 1; at++) {
			if (!joined.has(at) || broken.has(at)) {
				breaks.add(at);
			}
		}
		return breaks;
	}

	/*
	 * The `<part-group>` spans that draw a connector, outermost first.
	 *
	 * Groups whose `<group-symbol>` is absent or 'none' draw nothing — they exist only to carry
	 * a name or a barline rule (see barlineBreaks) — and one spanning a single part has nothing
	 * to connect. 'square' falls back to 'bracket' (vexflow draws no squared bracket).
	 *
	 * ponytail: `<group-abbreviation>` is ignored — it's the short name for systems after the
	 * first, and vexml prints part labels on the first system only, so nothing would ever use it.
	 */
	partGroups(score: Score): PartGroup[] {
		return score.partGroups
			.flatMap((group) => {
				const symbol = this.groupSymbol(group.symbol);
				return symbol && group.toPartIndex > group.fromPartIndex
					? [
							{
								fromPart: group.fromPartIndex,
								toPart: group.toPartIndex,
								symbol,
								depth: group.depth,
								name: group.name,
							},
						]
					: [];
			})
			.sort((a, b) => a.depth - b.depth);
	}

	/*
	 * The repeat and volta (ending) structure a document's `<barline>`s describe, resolved
	 * for every measure in one document-order pass. The renderer (repeat dots, volta
	 * brackets) and the playback sequence (jump expansion) must agree about where a repeat
	 * block or an ending begins and ends, so the resolution lives here.
	 *
	 * An ending spans measures and MusicXML only marks its edges, so the middle of a run is
	 * only knowable in document order. Two encodings appear in the wild and both resolve
	 * here: the standard one marks `start` on the run's first measure and `stop` on its
	 * last, while some exporters restate `start`/`stop` on every measure of the run. A
	 * `stop` the next measure immediately reopens with the same number is that restatement
	 * — one bracket over the whole run, one ending for playback — not a pile of adjacent
	 * one-measure endings.
	 */
	measureRepeats(measures: readonly Measure[]): MeasureRepeat[] {
		const read = measures.map((measure) => this.readBarlines(measure));
		const out: MeasureRepeat[] = [];
		let open: string | null = null;
		for (const [i, r] of read.entries()) {
			// A measure with no `start` of its own inherits the run already open over it.
			const number: string | null = r.started ?? open;
			const first = number !== null && open === null;
			const restated: boolean =
				r.closed !== null && read[i + 1]?.started === number;
			const last: boolean = r.closed !== null && !restated;
			open = number === null || last ? null : number;
			out.push({
				repeatBegin: r.repeatBegin,
				repeatEnd: r.repeatEnd,
				repeatTimes: r.repeatTimes,
				ending:
					number === null
						? null
						: {
								number,
								first,
								last,
								// An ending closes with a down hook only when something jumps back from it, or
								// when the piece stops there. `discontinue` asks for an open bracket outright;
								// otherwise the backward repeat is the signal — a final ending runs on into
								// the music, so its bracket stays open even though exporters routinely still
								// write `type="stop"` on it. At the last measure there's nothing to run into.
								open:
									last &&
									(r.closed === 'discontinue' ||
										(!r.repeatEnd && i < read.length - 1)),
							},
			});
		}
		return out;
	}

	/**
	 * One side of a metric modulation, as the drawing side wants it. Beams are counted rather
	 * than tracked as a run: a 'begin'/'continue' marker means that beam level carries on to the
	 * NEXT note, so counting them gives the beams to draw in the gap, while an 'end'/'backward
	 * hook' marker only says this note is beamed at all.
	 */
	private modulationNotesOf(notes: MetronomeNote[]): ModulationNote[] {
		return notes.map((note) => ({
			type: note.type,
			dots: note.dots,
			beamed: note.beams.length > 0,
			beamsToNext: note.beams.filter(
				(beam) => beam === 'begin' || beam === 'continue',
			).length,
			tuplet: note.tuplet
				? { actual: note.tuplet.actual, type: note.tuplet.type }
				: null,
		}));
	}

	/**
	 * A `<direction>`'s placement attribute. MusicXML leaves it optional and the default is
	 * renderer's choice; vexml keeps 'above' as the default so an unmarked directive draws
	 * where it always has. Callers that engrave BELOW by convention (dynamics, wedges) pass
	 * their own default rather than reading it from here.
	 */
	private placementOf(
		direction: Direction,
		fallback: Placement = 'above',
	): Placement {
		return direction.placement ?? fallback;
	}

	/*
	 * Swap the ASCII accidentals a <kind text="…"> suffix carries for an extension (e.g.
	 * "7(b9#11)") for the real Unicode signs ("7(♭9♯11)"), so they match the root's ♭/♯
	 * and pick up drawHarmony's smaller accidental sizing. An accidental in an extension
	 * always sits before its scale-degree number, so the digit lookahead avoids touching
	 * any letter that just happens to be a "b" (none of the suffix words use one, but the
	 * lookahead keeps it unambiguous).
	 */
	private harmonyExtensionSigns(kind: string): string {
		return kind.replace(/b(?=\d)/g, '♭').replace(/#(?=\d)/g, '♯');
	}

	/*
	 * A <harmony>'s printed chord symbol, e.g. "G7", "C", "F♯m": the <root-step> plus
	 * any <root-alter> sign, then the <kind text="…"> suffix MusicXML carries for
	 * exactly this (a major triad's text is empty, so it prints the bare root), falling
	 * back to the kind's conventional suffix when the exporter omits the attribute. A
	 * <bass> (slash chord) appends "/<bass-step><bass-alter>", e.g. "E♭/B♭".
	 * ponytail: <degree> alterations (an added 9th, a flat 5) are ignored — they only
	 * refine a suffix the kind already names. Fold them in if a fixture needs "C5(add9)".
	 */
	private harmonyText(harmony: Harmony): string {
		const root = harmony.root;
		const step = root?.step ?? '';
		const alter = root ? (HARMONY_ALTER[root.alter ?? ''] ?? '') : '';
		const kindEl = harmony.kind;
		const kind = this.harmonyExtensionSigns(
			kindEl?.text ?? (kindEl ? (HARMONY_KIND_SUFFIX[kindEl.value] ?? '') : ''),
		);
		const bass = harmony.bass;
		const bassText = bass?.step
			? `/${bass.step}${HARMONY_ALTER[bass.alter ?? ''] ?? ''}`
			: '';
		return step + alter + kind + bassText;
	}

	/*
	 * The chord-diagram (<frame>) carried by a <harmony>, parsed into the ChordDiagramGlyph
	 * spec. MusicXML <fret>s are absolute, so they're shifted to be relative to
	 * <first-fret> (the top displayed fret line, drawn as the position label). Strings
	 * with no <frame-note> are muted ('x'); fret 0 is an open string. A <barre> spans
	 * from its `start` frame-note's string to its `stop` frame-note's string, at the
	 * shared (relative) fret. Returns null when the harmony carries no <frame>.
	 * MusicXML numbers strings high-to-low (1 = highest), matching the ChordDiagramGlyph's
	 * left-to-right (string 1 rightmost) convention.
	 */
	private frameOf(harmony: Harmony): ChordFrame | null {
		const frame = harmony.frame;
		if (!frame) {
			return null;
		}
		const numStrings = frame.strings;
		const frameNotes = frame.frameNotes;

		// string -> absolute fret (0 = open).
		const absFret = new Map<number, number>();
		for (const fn of frameNotes) {
			absFret.set(fn.string, fn.fret);
		}
		const fretted = [...absFret.values()].filter((f) => f > 0);

		// <first-fret> is the absolute fret of the box's top line. Lead sheets often omit it, so
		// derive it: a chord with no open strings whose lowest fretted note is past the nut
		// starts the box at that fret instead of drawing a tall, mostly-empty box down from the
		// nut. Open strings pin the box to the nut (firstFret 1).
		const hasOpen = [...absFret.values()].includes(0);
		const firstFret =
			frame.firstFret ??
			(fretted.length > 0 && !hasOpen ? Math.min(...fretted) : 1);
		const toRelative = (abs: number) => (abs === 0 ? 0 : abs - firstFret + 1);

		const played = new Map<number, number>(); // string -> relative fret
		const barreStart = new Map<number, number>(); // relative fret -> from string
		const barres: ChordFrame['barres'] = [];
		for (const fn of frameNotes) {
			const relFret = toRelative(fn.fret);
			played.set(fn.string, relFret);
			if (fn.barre === 'start') {
				barreStart.set(relFret, fn.string);
			} else if (fn.barre === 'stop') {
				const from = barreStart.get(relFret);
				if (from !== undefined) {
					barres?.push({
						fromString: from,
						toString: fn.string,
						fret: relFret,
					});
				}
			}
		}

		// Position label, for movable shapes only (box not at the nut). Its number is the fret of
		// the lowest-sounding fretted string (the highest played string number), drawn beside
		// that note's row rather than at the box top — guitarists finger from the lowest string
		// up, so the number marks where the hand sits. The box layout still keys off firstFret
		// (the lowest fret), so the dots stay compact regardless of where the label lands.
		let position = firstFret;
		let positionText = 0;
		if (firstFret > 1 && fretted.length > 0) {
			const lowString = Math.max(
				...[...absFret].filter(([, f]) => f > 0).map(([s]) => s),
			);
			const lowFret = absFret.get(lowString) as number;
			position = lowFret;
			positionText = lowFret - firstFret;
		}

		const chord: ChordFrame['chord'] = [];
		for (let s = 1; s <= numStrings; s += 1) {
			chord.push([s, played.has(s) ? (played.get(s) as number) : 'x']);
		}
		return { chord, position, positionText, barres };
	}

	/*
	 * The <multiple-rest> count every staff of a measure agrees on, or null when they disagree (or
	 * when there is none). Collapsing removes the whole measure COLUMN, so a run declared on only
	 * some of a part's staves must not collapse — the others' music would be swallowed with it.
	 *
	 * A <measure-style> with no `number` applies to every staff, so an ordinary multirest agrees
	 * trivially; only an explicit per-staff disagreement trips this.
	 * ponytail: no fixture covers that case — no score in tmp/ writes one, and both hands of a
	 * piano rest together. It's here because the failure it prevents is deleting played music.
	 */
	private multiRestCountOf(measure: Measure | undefined): number | null {
		if (!measure) {
			return null;
		}
		const count = measure.getMultiRestCount('1');
		for (let staff = 2; staff <= measure.staveCount; staff++) {
			if (measure.getMultiRestCount(String(staff)) !== count) {
				return null;
			}
		}
		return count;
	}

	/** MusicXML `<group-symbol>` -> the connector vexml draws. null means "draw nothing". */
	private groupSymbol(
		symbol: PartGroupSpan['symbol'],
	): PartGroup['symbol'] | null {
		switch (symbol) {
			case 'brace':
				return 'brace';
			case 'bracket':
			// vexflow has no squared-bracket connector; a bracket is the nearest reading.
			case 'square':
				return 'bracket';
			case 'line':
				return 'line';
			default:
				return null;
		}
	}

	/* One measure's `<barline>`s flattened: MusicXML allows several (a left repeat and a right one),
	 * and the edge each sits on is already implied by its repeat direction and ending type. */
	private readBarlines(measure: Measure): BarlineRead {
		const read: BarlineRead = {
			repeatBegin: false,
			repeatEnd: false,
			repeatTimes: null,
			started: null,
			closed: null,
		};
		for (const barline of measure.barlines) {
			if (barline.repeat === 'forward') {
				read.repeatBegin = true;
			} else if (barline.repeat === 'backward') {
				read.repeatEnd = true;
				read.repeatTimes = barline.repeatTimes;
			}
			const ending = barline.ending;
			if (ending?.type === 'start') {
				read.started = ending.number;
			} else if (ending) {
				read.closed = ending.type;
			}
		}
		return read;
	}
}
