import {
	Barline,
	type Chord,
	Clef,
	type Harmony,
	type Key,
	MElement,
	type Measure,
	Note,
	type Part,
	type Voice as ScoreVoice,
	type Time,
} from '@stringsync/mdom';
import { DEFAULT_TEMPO_BPM, EPSILON } from '../constants';
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

function lineEndOf(element: MElement): LineEnd {
	const value = element.getAttribute('line-end');
	return value === 'up' || value === 'down' || value === 'arrow'
		? value
		: 'none';
}

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
 * The <multiple-rest> count every staff of a measure agrees on, or null when they disagree (or
 * when there is none). Collapsing removes the whole measure COLUMN, so a run declared on only
 * some of a part's staves must not collapse — the others' music would be swallowed with it.
 *
 * A <measure-style> with no `number` applies to every staff, so an ordinary multirest agrees
 * trivially; only an explicit per-staff disagreement trips this.
 * ponytail: no fixture covers that case — no score in tmp/ writes one, and both hands of a
 * piano rest together. It's here because the failure it prevents is deleting played music.
 */
function multiRestCountOf(measure: Measure | undefined): number | null {
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
		const steps = key?.childrenNamed('key-step') ?? [];
		if (steps.length === 0) {
			return null;
		}
		const alters = key?.childrenNamed('key-alter') ?? [];
		return steps
			.map((step, index) => `${step.text}${alters[index]?.text ?? '0'}`)
			.join(' ');
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
	 * A measure's <barline location="middle"> dividers: the beat each one falls on and its
	 * <bar-style>. These are the barlines that land off the measure edge — a double bar or a
	 * dotted divider mid-bar — which MusicXML writes between two notes rather than at an
	 * edge, so the beat comes from the running position of the notes before it in document
	 * order. Left/right barlines are the measure's own edges and are read elsewhere.
	 * ponytail: a <backup> is not rewound here, so on a multi-voice measure the divider binds
	 * to the last note in DOCUMENT order rather than to the beat the second voice reached.
	 * Every mid-measure barline in tmp/ is single-voice; add the rewind if one isn't.
	 */
	midBarlinesOf(measure: Measure): { beat: number; style: string }[] {
		const out: { beat: number; style: string }[] = [];
		let beat = 0;
		for (const child of measure.children) {
			if (child instanceof Note) {
				// A chord member shares its lead's onset and a grace steals no time, so
				// neither advances the position.
				if (!child.isChordMember && !child.isGrace) {
					beat = (child.measureBeat ?? beat) + (child.beats ?? 0);
				}
			} else if (child instanceof Barline && child.location === 'middle') {
				out.push({ beat, style: child.barStyle ?? 'regular' });
			}
		}
		return out;
	}

	/*
	 * A measure's mid-measure <clef> changes for one staff: the beat each one lands on and
	 * the <clef> itself. MusicXML writes these as an <attributes> block sitting between two
	 * notes rather than at the measure's head.
	 *
	 * Only blocks AFTER the measure's first note count: the leading <attributes> is the
	 * measure's own signature block, already drawn with the stave (Measure.getClef reads
	 * exactly that one). A block trailing the LAST note lands at the measure's end beat and
	 * engraves as the courtesy clef before the barline.
	 *
	 * The beat comes from the NEXT note's own measureBeat rather than from a running sum of
	 * the durations before it, because measureBeat already rewinds a <backup> — which is how
	 * a grand staff writes its lower staff's clef (upper notes, backup, <attributes>
	 * <clef number="2">, lower notes), and that block belongs at beat 0, not at the end.
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
		const children = measure.children;
		const endBeat = this.endBeatOf([{ chords: measure.chords }]);
		const out: { beat: number; clef: Clef }[] = [];
		let seenNote = false;
		for (let index = 0; index < children.length; index++) {
			const child = children[index];
			if (child instanceof Note) {
				seenNote = true;
				continue;
			}
			if (!seenNote || !(child instanceof MElement)) {
				continue;
			}
			const clefs = child
				.childrenOfType(Clef)
				.filter((clef) => clef.staff === staffNumber);
			if (clefs.length === 0) {
				continue;
			}
			// No note after it means it trails the measure: the courtesy clef, at the end beat.
			let beat = endBeat;
			for (let ahead = index + 1; ahead < children.length; ahead++) {
				const next = children[ahead];
				if (next instanceof Note) {
					beat = next.measureBeat ?? endBeat;
					break;
				}
			}
			if (beat > EPSILON) {
				out.push(...clefs.map((clef) => ({ beat, clef })));
			}
		}
		return out;
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
			const count = multiRestCountOf(parts[0]?.measures[m]);
			if (
				!count ||
				count < 2 ||
				!parts.every((part) => multiRestCountOf(part.measures[m]) === count)
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
	 * A measure's navigation signs — <direction><direction-type><segno/> and <coda/> — in
	 * document order. These are the landmarks a D.S./D.C. jumps to. The words that drive them
	 * ("D.S. al Coda", "Fine") are ordinary <words> and already print via {@link wordsOf}; only
	 * the two GLYPHS are here.
	 * ponytail: the sign's own placement/x attributes are ignored — MusicXML lets a segno be
	 * offset anywhere, but every one in tmp/ sits at its measure's start, which is where a
	 * player looks for it.
	 */
	navigationsOf(measure: Measure): Array<'segno' | 'coda'> {
		return measure.directions.flatMap((d) =>
			d
				.childrenNamed('direction-type')
				.flatMap((type) =>
					type.children.filter((c): c is MElement => c instanceof MElement),
				)
				.filter((mark) => mark.tag === 'segno' || mark.tag === 'coda')
				.map((mark) => mark.tag as 'segno' | 'coda'),
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
				const marks = direction
					.childrenNamed('direction-type')
					.flatMap((type) => [
						...type.childrenNamed('bracket'),
						...type.childrenNamed('dashes'),
					]);
				for (const mark of marks) {
					const key = `${mark.tag}:${mark.getAttribute('number') ?? '1'}`;
					if (mark.getAttribute('type') === 'stop') {
						const opened = open.get(key);
						open.delete(key);
						const to = direction.nextNote ?? direction.previousNote;
						if (opened && to && opened.from !== to) {
							spans.push({
								...opened,
								to,
								stopEnd: mark.tag === 'dashes' ? 'none' : lineEndOf(mark),
							});
						}
						continue;
					}
					// 'continue' only re-states an open span, so only a 'start' opens one.
					if (mark.getAttribute('type') !== 'start') {
						continue;
					}
					const from = direction.nextNote;
					if (!from) {
						continue;
					}
					open.set(key, {
						from,
						above: placementOf(direction) === 'above',
						dash:
							mark.tag === 'dashes'
								? [5, 5]
								: (LINE_TYPE_DASH[mark.getAttribute('line-type') ?? 'solid'] ??
									null),
						startEnd: mark.tag === 'dashes' ? 'none' : lineEndOf(mark),
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
