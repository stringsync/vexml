import {
	type Chord,
	type Harmony,
	MElement,
	type Measure,
	type Note,
	type Part,
	type Voice as ScoreVoice,
	type Time,
} from '@stringsync/mdom';
import { DEFAULT_TEMPO_BPM } from '../constants';
import type { ChordFrame } from './chord-diagram-glyph';

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
 * The `<direction-type><metronome>` element of a `<direction>`, or null when it carries
 * none. mdom's own `metronome` accessor flattens the element to its FIRST beat unit, which
 * loses the metric-modulation form and the `parentheses` attribute, so read the raw child.
 */
function metronomeOf(direction: MElement): MElement | null {
	for (const type of direction.childrenNamed('direction-type')) {
		const metronome = type.child('metronome');
		if (metronome) {
			return metronome;
		}
	}
	return null;
}

/**
 * A `<metronome>`'s beat units in document order: each `<beat-unit>` paired with the count
 * of `<beat-unit-dot/>` markers that trail it. MusicXML puts the dots AFTER the unit they
 * modify rather than inside it, so a positional walk is the only way to tell "dotted
 * quarter = half" from "quarter = dotted half".
 */
function beatUnitsOf(
	metronome: MElement,
): Array<{ unit: string; dots: number }> {
	const units: Array<{ unit: string; dots: number }> = [];
	for (const child of metronome.children) {
		if (!(child instanceof MElement)) {
			continue;
		}
		if (child.tag === 'beat-unit') {
			units.push({ unit: child.text ?? 'quarter', dots: 0 });
		} else if (child.tag === 'beat-unit-dot') {
			const last = units.at(-1);
			if (last) {
				last.dots++;
			}
		}
	}
	return units;
}

/** Which side of the staff a `<direction>` prints on. */
export type Placement = 'above' | 'below';

/**
 * A `<direction>`'s placement attribute. MusicXML leaves it optional and the default is
 * renderer's choice; vexml keeps 'above' as the default so an unmarked directive draws
 * where it always has. Callers that engrave BELOW by convention (dynamics, wedges) pass
 * their own default rather than reading it from here.
 */
function placementOf(
	direction: MElement,
	fallback: Placement = 'above',
): Placement {
	const placement = direction.getAttribute('placement');
	return placement === 'below' || placement === 'above' ? placement : fallback;
}

/*
 * SMuFL gives each dynamic LETTER its own glyph (dynamicPiano U+E520 … dynamicNiente
 * U+E526), and every standard marking is spelled out of those seven: "sfz" is s+f+z,
 * "mp" is m+p. Composing from the singles covers the whole MusicXML vocabulary without a
 * 24-entry table of ligature codepoints, and Bravura's sidebearings already space them.
 */
const DYNAMIC_GLYPHS: Record<string, string> = {
	p: '\uE520', // dynamicPiano
	m: '\uE521', // dynamicMezzo
	f: '\uE522', // dynamicForte
	r: '\uE523', // dynamicRinforzando
	s: '\uE524', // dynamicSforzando
	z: '\uE525', // dynamicZ
	n: '\uE526', // dynamicNiente
};

/** True when every letter of a marking has a SMuFL glyph, so it can engrave as music
 * rather than as text — false for an <other-dynamics> like "abc-ffz". */
function isDynamicSpelling(text: string): boolean {
	return [...text].every((ch) => ch in DYNAMIC_GLYPHS);
}

/** A marking respelled in SMuFL dynamic glyphs. Callers check {@link isDynamicSpelling}
 * (via the `glyph` flag) first; an unmapped character passes through unchanged. */
export function dynamicGlyphs(text: string): string {
	return [...text].map((ch) => DYNAMIC_GLYPHS[ch] ?? ch).join('');
}

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

// MusicXML <root-alter>/<bass-alter> semitones -> the printed accidental sign, using the
// real Unicode music symbols (♯ ♭ ♮). 0 prints an explicit natural — rare in a root, but
// MusicXML carries it when the chart wants the sign drawn. An absent <root-alter> maps to
// nothing (no sign), so plain roots stay bare.
const HARMONY_ALTER: Record<string, string> = { '1': '♯', '-1': '♭', '0': '♮' };

/*
 * Swap the ASCII accidentals a <kind text="…"> suffix carries for an extension (e.g.
 * "7(b9#11)") for the real Unicode signs ("7(♭9♯11)"), so they match the root's ♭/♯
 * and pick up drawHarmony's smaller accidental sizing. An accidental in an extension
 * always sits before its scale-degree number, so the digit lookahead avoids touching
 * any letter that just happens to be a "b" (none of the suffix words use one, but the
 * lookahead keeps it unambiguous).
 */
function harmonyExtensionSigns(kind: string): string {
	return kind.replace(/b(?=\d)/g, '♭').replace(/#(?=\d)/g, '♯');
}

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
 * A <harmony>'s printed chord symbol, e.g. "G7", "C", "F♯m": the <root-step> plus
 * any <root-alter> sign, then the <kind text="…"> suffix MusicXML carries for
 * exactly this (a major triad's text is empty, so it prints the bare root), falling
 * back to the kind's conventional suffix when the exporter omits the attribute. A
 * <bass> (slash chord) appends "/<bass-step><bass-alter>", e.g. "E♭/B♭".
 * ponytail: <degree> alterations (an added 9th, a flat 5) are ignored — they only
 * refine a suffix the kind already names. Fold them in if a fixture needs "C5(add9)".
 */
function harmonyText(harmony: Harmony): string {
	const root = harmony.root;
	const step = root?.step ?? '';
	const alter = root ? (HARMONY_ALTER[root.alter ?? ''] ?? '') : '';
	const kindEl = harmony.kind;
	const kind = harmonyExtensionSigns(
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
function frameOf(harmony: Harmony): ChordFrame | null {
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
				barres?.push({ fromString: from, toString: fn.string, fret: relFret });
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
 * Reads score semantics straight off the mdom: staff voice selection, meter lengths,
 * and the direction/harmony markers a measure carries. Stateless — the layout
 * (measuring) and draw passes must read identically, so the predicates live here.
 */
export class ScoreReader {
	/*
	 * One staff's renderable voices in a measure: voices assigned to this staff that
	 * actually carry notes (an empty voice would crash the formatter). The layout
	 * (measuring) and draw passes must select identically, so the predicate lives here.
	 */
	staffVoices(voices: ScoreVoice[], staffNumber: string): ScoreVoice[] {
		return voices.filter((v) => v.staff === staffNumber && v.chords.length > 0);
	}

	/*
	 * The beat length a measure's width is floored at (see meterBeats), except for a
	 * <measure implicit="yes"> — a pickup bar, or the back half of a measure split across a
	 * system break — which floors at 0 so it is sized to the music it actually holds. An
	 * implicit measure is short BY DECLARATION, not underfull by accident, so padding it out
	 * to the meter would draw a pickup as wide as a full bar.
	 */
	meterFloor(measure: Measure, staffNumber?: string): number {
		return measure.getAttribute('implicit') === 'yes'
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
	 * A measure's metronome mark from the first <direction> that carries a
	 * <metronome>, or null when none does. MusicXML's <beat-unit> names ('quarter',
	 * 'eighth', 'half', ...) already match StaveTempo's duration codes. bpm comes from
	 * <per-minute>, falling back to the <sound tempo>, then to 120 — so a metronome
	 * directive without a number still prints "= 120".
	 *
	 * A SECOND <beat-unit> is the metric-modulation form ("dotted quarter = dotted half"),
	 * which states a relation rather than a rate and so carries no <per-minute>; bpm keeps
	 * its fallback for the playback path, which has no way to read a relation.
	 * ponytail: only the first <metronome> in a measure engraves, as before — vexml draws
	 * one mark per measure, anchored over its first note, and no fixture asks for two.
	 */
	tempoOf(measure: Measure): TempoMark | null {
		for (const direction of measure.directions) {
			const metronome = metronomeOf(direction);
			if (!metronome) {
				continue;
			}
			const [first, second] = beatUnitsOf(metronome);
			if (!first) {
				continue;
			}
			const perMinute = metronome.child('per-minute')?.text;
			const sound = direction.soundTempo;
			return {
				duration: first.unit,
				dots: first.dots,
				bpm: Number(perMinute ?? sound) || DEFAULT_TEMPO_BPM,
				duration2: second?.unit ?? null,
				dots2: second?.dots ?? 0,
				parenthesis: metronome.getAttribute('parentheses') === 'yes',
			};
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
		for (const direction of measure.directions) {
			if (direction.soundTempo !== null) {
				return { duration: 'quarter', bpm: direction.soundTempo };
			}
		}
		const bpm = Number(measure.child('sound')?.getAttribute('tempo'));
		if (bpm) {
			return { duration: 'quarter', bpm };
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
			const staffNumber = d.child('staff')?.text ?? '1';
			const lead = d.nextNote;
			const placement = placementOf(d);
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
			const staffNumber = d.child('staff')?.text ?? '1';
			const lead = d.nextNote;
			const placement = placementOf(d, 'below');
			return d
				.childrenNamed('direction-type')
				.flatMap((type) => type.childrenNamed('dynamics'))
				.flatMap((dynamics) =>
					dynamics.children.filter((c): c is MElement => c instanceof MElement),
				)
				.map((mark) =>
					mark.tag === 'other-dynamics' ? (mark.text ?? '') : mark.tag,
				)
				.filter(Boolean)
				.map((text) => ({
					text,
					glyph: isDynamicSpelling(text),
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
	 * Read off the generic element axes: mdom's Direction defers rehearsal, so there's no
	 * typed accessor for it yet.
	 * ponytail: the <rehearsal> enclosure/font attributes are ignored — every mark prints
	 * boxed in the default style; add an enclosure field if a fixture needs a circle or a
	 * bare letter.
	 */
	rehearsalsOf(measure: Measure): string[] {
		return measure.directions.flatMap((d) =>
			d
				.childrenNamed('direction-type')
				.flatMap((type) => type.childrenNamed('rehearsal'))
				.map((rehearsal) => rehearsal.text ?? '')
				.filter(Boolean),
		);
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
					placement: placementOf(direction, 'below'),
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
					spans.push({
						notes: notes.slice(first, last + 1),
						octaves: opened.down ? octaves : -octaves,
						// "8va"/"8vb" for one octave; two or three take the -ma/-mb suffixes.
						label: String(opened.size),
						suffix:
							octaves === 1
								? opened.down
									? 'va'
									: 'vb'
								: opened.down
									? 'ma'
									: 'mb',
						above: opened.down,
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
	 */
	harmoniesOf(measure: Measure): {
		lead: Note;
		text: string;
		frame: ChordFrame | null;
		source: MElement;
	}[] {
		const harmonies: {
			lead: Note;
			text: string;
			frame: ChordFrame | null;
			source: MElement;
		}[] = [];
		for (const harmony of measure.harmonies) {
			const lead = harmony.nextNote;
			if (!lead) {
				continue;
			}
			const text = harmonyText(harmony);
			const frame = frameOf(harmony);
			if (text || frame) {
				harmonies.push({ lead, text, frame, source: harmony });
			}
		}
		return harmonies;
	}

	/*
	 * The beat a measure's voices run out to: the latest onset+duration across them.
	 * Voices that end before this (e.g. one silent on the final beat via <forward>)
	 * are padded out to it so every voice spans the same range — see the trailing
	 * fill in vexflowVoiceTickables.
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
}
