import type {
	Chord,
	Measure,
	Voice as ScoreVoice,
	Time,
} from '@stringsync/mdom';
import { MElement, Note } from '@stringsync/mdom';
import { DEFAULT_TEMPO_BPM } from '../constants';
import type { ChordFrame } from './chord-diagram-glyph';

/** A metronome mark: the beat-unit's vexflow duration code plus its bpm. */
export type TempoMark = { duration: string; bpm: number };

// A <direction><direction-type><pedal> spanner marker, bound to the lead note it
// anchors. `line` carries the MusicXML line="yes" flag (bracket pedal vs. the
// default "Ped…*" text); it rides on every marker so the stop knows the style.
export type PedalMark = {
	lead: Note;
	type: 'start' | 'stop';
	number: string;
	line: boolean;
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

/*
 * A <harmony>'s printed chord symbol, e.g. "G7", "C", "F♯m": the <root-step> plus
 * any <root-alter> sign, then the <kind text="…"> suffix MusicXML carries for
 * exactly this (a major triad's text is empty, so it prints the bare root). A
 * <bass> (slash chord) appends "/<bass-step><bass-alter>", e.g. "E♭/B♭".
 * ponytail: a <kind> without a text attribute prints just the root — no
 * kind-name->suffix table (major-seventh -> "maj7", …); add one if a fixture needs it.
 */
function harmonyText(harmony: MElement): string {
	const root = harmony.child('root');
	const step = root?.child('root-step')?.text ?? '';
	const alter = root?.child('root-alter')?.text ?? '';
	const kind = harmonyExtensionSigns(
		harmony.child('kind')?.getAttribute('text') ?? '',
	);
	const bass = harmony.child('bass');
	const bassStep = bass?.child('bass-step')?.text ?? '';
	const bassAlter = bass?.child('bass-alter')?.text ?? '';
	const bassText = bassStep
		? `/${bassStep}${HARMONY_ALTER[bassAlter] ?? ''}`
		: '';
	return step + (HARMONY_ALTER[alter] ?? '') + kind + bassText;
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
function frameOf(harmony: MElement): ChordFrame | null {
	const frame = harmony.child('frame');
	if (!frame) {
		return null;
	}
	const numStrings = Number(frame.child('frame-strings')?.text) || 6;
	const frameNotes = frame.childrenNamed('frame-note');

	// string -> absolute fret (0 = open); skip notes with a non-numeric string.
	const absFret = new Map<number, number>();
	for (const fn of frameNotes) {
		const string = Number(fn.child('string')?.text);
		if (Number.isFinite(string)) {
			absFret.set(string, Number(fn.child('fret')?.text) || 0);
		}
	}
	const fretted = [...absFret.values()].filter((f) => f > 0);

	// <first-fret> is the absolute fret of the box's top line. Lead sheets often omit it, so
	// derive it: a chord with no open strings whose lowest fretted note is past the nut
	// starts the box at that fret instead of drawing a tall, mostly-empty box down from the
	// nut. Open strings pin the box to the nut (firstFret 1).
	const explicitFirstFret = Number(frame.child('first-fret')?.text);
	const hasOpen = [...absFret.values()].includes(0);
	const firstFret =
		explicitFirstFret ||
		(fretted.length > 0 && !hasOpen ? Math.min(...fretted) : 1);
	const toRelative = (abs: number) => (abs === 0 ? 0 : abs - firstFret + 1);

	const played = new Map<number, number>(); // string -> relative fret
	const barreStart = new Map<number, number>(); // relative fret -> from string
	const barres: ChordFrame['barres'] = [];
	for (const fn of frameNotes) {
		const string = Number(fn.child('string')?.text);
		if (!Number.isFinite(string)) {
			continue;
		}
		const relFret = toRelative(Number(fn.child('fret')?.text) || 0);
		played.set(string, relFret);
		const barre = fn.child('barre')?.getAttribute('type');
		if (barre === 'start') {
			barreStart.set(relFret, string);
		} else if (barre === 'stop') {
			const from = barreStart.get(relFret);
			if (from !== undefined) {
				barres?.push({ fromString: from, toString: string, fret: relFret });
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
		const beats = Number(time.beats);
		const beatType = Number(time.beatType);
		if (!beats || !beatType) {
			return 0;
		}
		return (beats / beatType) * 4;
	}

	/*
	 * A measure's metronome mark from the first <direction> that carries a
	 * <metronome>, or null when none does. MusicXML's <beat-unit> names ('quarter',
	 * 'eighth', 'half', ...) already match StaveTempo's duration codes. bpm comes from
	 * <per-minute>, falling back to the <sound tempo>, then to 120 — so a metronome
	 * directive without a number still prints "= 120".
	 * ponytail: dotted beat-units (<beat-unit-dot/>) ignored; add a `dots` field if a
	 * fixture needs a dotted metronome note.
	 */
	tempoOf(measure: Measure): TempoMark | null {
		for (const direction of measure.directions) {
			const metronome = direction.child('direction-type')?.child('metronome');
			if (!metronome) {
				continue;
			}
			const duration = metronome.child('beat-unit')?.text ?? 'quarter';
			const perMinute = metronome.child('per-minute')?.text;
			const sound = direction.child('sound')?.getAttribute('tempo');
			return { duration, bpm: Number(perMinute ?? sound) || DEFAULT_TEMPO_BPM };
		}
		return null;
	}

	/*
	 * A measure's <direction><direction-type><words> text directives (e.g. "ritardando",
	 * "dolce"), in document order. These are free-text expressions printed above the stave.
	 * ponytail: placement and font-style attributes ignored — every words direction prints
	 * above the staff in italics; add a placement/style field if a fixture needs below or
	 * upright words.
	 */
	wordsOf(measure: Measure): string[] {
		const out: string[] = [];
		for (const direction of measure.directions) {
			const words = direction.child('direction-type')?.child('words')?.text;
			if (words) {
				out.push(words);
			}
		}
		return out;
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
		const pendingStarts: { number: string; line: boolean }[] = [];
		let lastLead: Note | null = null;
		for (const child of measure.children) {
			if (child instanceof MElement && child.tag === 'direction') {
				const pedal = child.child('direction-type')?.child('pedal');
				const type = pedal?.getAttribute('type');
				if (type === 'start' || type === 'stop') {
					const number = pedal?.getAttribute('number') ?? '1';
					const line = pedal?.getAttribute('line') === 'yes';
					if (type === 'start') {
						pendingStarts.push({ number, line });
					} else if (lastLead) {
						out.push({ lead: lastLead, type, number, line });
					}
				}
			} else if (child instanceof Note && !child.isChordMember) {
				for (const start of pendingStarts) {
					out.push({ lead: child, type: 'start', ...start });
				}
				pendingStarts.length = 0;
				lastLead = child;
			}
		}
		return out;
	}

	/*
	 * Each <harmony> in a measure paired with the lead note it sits above. <harmony>
	 * elements are interleaved with <note>s in document order and apply to the note
	 * that follows, so walk the measure's children tracking the pending harmony and
	 * bind it to the next chord lead (the next non-<chord/> note). `frame` is the
	 * chord-diagram spec when the harmony carries a <frame>, else null. `source` is
	 * the raw <harmony> MElement itself — element provenance (mdom doesn't type harmony).
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
		let pending: MElement | null = null;
		for (const child of measure.children) {
			if (child instanceof MElement && child.tag === 'harmony') {
				pending = child;
			} else if (pending && child instanceof Note && !child.isChordMember) {
				const text = harmonyText(pending);
				const frame = frameOf(pending);
				if (text || frame) {
					harmonies.push({ lead: child, text, frame, source: pending });
				}
				pending = null;
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
