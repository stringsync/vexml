import type { Chord, Note } from '@stringsync/mdom';
import {
	Accidental,
	Annotation,
	Dot,
	GraceNote,
	Modifier,
	Parenthesis,
	StaveNote,
	Stem,
} from 'vexflow';
import type { DurationTranslator } from './duration-translator';
import type { NotationTranslator } from './notation-translator';

/*
 * MusicXML <accidental> glyph name -> vexflow accidental code. The natural-sharp and
 * natural-flat courtesy forms have no vexflow code, so they pass their SMuFL glyph
 * straight through — Tables.accidentalCodes returns an unrecognized code verbatim, and
 * the accidental is drawn in the music font either way.
 */
export const ACCIDENTAL_CODES: Record<string, string> = {
	sharp: '#',
	flat: 'b',
	natural: 'n',
	'double-sharp': '##',
	'sharp-sharp': '##',
	'flat-flat': 'bb',
	'natural-sharp': '\uE268', // accidentalNaturalSharp
	'natural-flat': '\uE267', // accidentalNaturalFlat
	'quarter-sharp': '+',
	'quarter-flat': 'd',
	'three-quarters-sharp': '++',
	'three-quarters-flat': 'db',
};

// SMuFL brackets around an editorial accidental (see ChordTranslator.addAccidentals).
const ACCIDENTAL_BRACKET_LEFT = '\uE26C'; // accidentalBracketLeft
const ACCIDENTAL_BRACKET_RIGHT = '\uE26D'; // accidentalBracketRight

// SMuFL slash-notehead glyphs by duration code (see NoteReader.isSlashNotehead).
const SLASH_GLYPHS: Record<string, string> = {
	w: '\uE102', // noteheadSlashWhiteWhole
	h: '\uE103', // noteheadSlashWhiteHalf
};
const SLASH_GLYPH_FILLED = '\uE100'; // noteheadSlashVerticalEnds
const SLASH_GLYPH_OPEN = '\uE103'; // noteheadSlashWhiteHalf, for filled="no"

/*
 * MusicXML <notehead> value -> vexflow key-suffix glyph code, appended to the key so vexflow
 * draws the alternate head (see vexflowKey). These codes go through vexflow's codeNoteHead, which
 * picks the duration-appropriate variant (open for half/whole, filled for quarter and shorter) —
 * except 'x' (dead notes), pinned to the always-black X2 by convention. Values vexflow has no
 * glyph for (cross, the plus-shaped head, and none) are absent and keep the default oval; slash
 * has no code and is redrawn post-build by addSlashNoteheads.
 */
const NOTEHEAD_SUFFIX: Record<string, string> = {
	x: 'X2', // cross
	diamond: 'DI',
	triangle: 'TU', // point-up triangle
	'inverted triangle': 'TD',
	square: 'SQ',
	rectangle: 'SQ', // vexflow draws no separate rectangle; a square is the nearest reading
	'circle-x': 'CX',
	slashed: 'SF',
	'back slashed': 'SB',
	// The shape-note heads, one glyph each (vexflow gives these no duration variants).
	do: 'DO',
	re: 'RE',
	mi: 'MI',
	fa: 'FA',
	'fa up': 'FAUP',
	so: 'SO',
	la: 'LA',
	ti: 'TI',
};

/*
 * The heads whose open and filled glyphs vexflow codes separately, so a `filled` attribute can
 * override the duration's default. Values not listed here have only the
 * duration-driven code in NOTEHEAD_SUFFIX and ignore the attribute.
 */
const NOTEHEAD_FILL_SUFFIX: Record<string, { open: string; filled: string }> = {
	x: { open: 'X1', filled: 'X2' },
	diamond: { open: 'D1', filled: 'D2' },
	triangle: { open: 'T1', filled: 'T2' },
	square: { open: 'S1', filled: 'S2' },
	rectangle: { open: 'S1', filled: 'S2' },
};

/*
 * Where an unpitched rest sits when voices share a stave: one line above the centered
 * line for the up-stemmed voice, one below for the down-stemmed ones, so two voices
 * resting on the same beat don't stack their glyphs on the same spot. Read against
 * vexflow's default treble positioning (the caller leaves `clef` unset), so these are
 * offsets from the middle line rather than real pitches. 'b/4' is the lone-voice center.
 */
const VOICE_REST_KEY = { up: 'd/5', down: 'g/4' } as const;

/*
 * A note (or rest) marked print-object="no": it holds its tick so the other voices stay
 * aligned, but draws nothing. Exporters lean on this to hide the spacer notes that keep a
 * voice open, so drawing them puts noteheads on the page that shouldn't be there.
 *
 * It stays a real StaveNote — it formats, reserves width, and pins its lyrics like any
 * other note — so only draw() changes. Lyrics still print: <lyric> carries its own
 * print-object, and the label an exporter hangs off a hidden note is the one thing about
 * it that IS meant to be seen (OSMD keeps them too). Annotation-only drawing mirrors
 * vexflow's own GhostNote.
 */
class InvisibleStaveNote extends StaveNote {
	constructor(...args: ConstructorParameters<typeof StaveNote>) {
		super(...args);
		// vexflow's own "this note isn't on the page" flag. Setting it matters beyond its
		// early return in StaveNote.draw (which this class overrides anyway): StaveNote.format
		// reads it when it pairs the voices sharing a tick, and two voices holding the same
		// rest there make it suppress ONE of them. Without the flag the survivor can be the
		// hidden note, blanking a rest that should print.
		this.renderOptions.draw = false;
	}

	override draw(): void {
		this.setRendered();
		const ctx = this.checkContext();
		for (const modifier of this.getModifiers()) {
			if (modifier instanceof Annotation) {
				modifier.setContext(ctx).drawWithStyle();
			}
		}
	}
}

/* The settings ChordTranslator.staveNote applies to one chord. */
interface VexflowChordOptions {
	/* Center the glyph in the measure, as a whole-measure rest is drawn. */
	alignCenter?: boolean;
	/* <clef-octave-change>: shifts every notehead's staff position by that many octaves
	 * (e.g. -1 for a treble-8vb guitar clef draws sounding pitches an octave higher).
	 * vexflow's own StaveNote option; keys stay at their sounding octave. */
	octaveShift?: number;
	/* Stem direction for notes without an explicit <stem>, set when multiple voices
	 * share the stave (voice 1 up, the rest down) so the voices stem apart. */
	defaultStem?: 'up' | 'down';
}

/*
 * One mdom chord — a lead note plus any <chord/> members — as the vexflow StaveNote that
 * draws it: its keys, noteheads, accidentals, dots, stem, and (in a later pass, once the
 * beams are settled) its colors. What hangs OFF the note once it exists (articulations,
 * ornaments, lyrics) is NotationTranslator's half.
 */
export class ChordTranslator {
	constructor(
		private readonly durations: DurationTranslator,
		private readonly notations: NotationTranslator,
	) {}

	/* The held tail of a tie: the note sounds on, but nothing about it is struck again. */
	private isHeld(note: Chord['notes'][number]): boolean {
		return note.ties.some((tie) => tie.tieType === 'stop');
	}

	/*
	 * Build a vexflow StaveNote for one chord (a lead note plus any <chord/> members;
	 * a single note is a one-member chord). Rests render as a centered rest glyph;
	 * grace notes (no <duration>) become small GraceNotes — slashed for an
	 * acciaccatura — which voiceTickables groups onto their host note; pitched
	 * notes stack their keys and carry each member's printed accidental, dots, stem
	 * direction, and articulations.
	 */
	staveNote(
		chord: Chord,
		clef: string,
		opts: VexflowChordOptions = {},
	): StaveNote {
		const { alignCenter = false, octaveShift = 0, defaultStem } = opts;
		const lead = chord.lead;
		const duration = this.durations.code(lead);
		// A hidden note builds as an InvisibleStaveNote: same formatting, no glyphs drawn.
		// ponytail: hiding is read off the lead only, so a chord with a mix of hidden and
		// visible members draws all of them; add per-notehead hiding if a fixture needs it.
		const NoteClass = lead.printObject ? StaveNote : InvisibleStaveNote;
		// Pass `dots` to the constructor so vexflow counts the dot(s) in the note's ticks
		// (Dot.buildAndAttach only draws the glyph, it never changes duration). Without it
		// a dotted note is one tick-position short and its voice falls out of alignment
		// with the others sharing the stave.
		if (lead.isRest) {
			const restKey = this.pitchedRestKey(lead);
			const rest = new NoteClass({
				keys: [
					restKey ??
						(defaultStem ? VOICE_REST_KEY[defaultStem] : undefined) ??
						'b/4',
				],
				duration: `${duration}r`,
				dots: lead.dots,
				// Only a display position resolves against the clef. The 'b/4' default and the
				// voice offsets around it are vexflow's centered line and must stay
				// clef-independent, or every bass-stave rest would jump to where B4 sits in
				// that clef.
				clef: restKey ? clef : undefined,
				// A whole rest alone in a measure is a full-measure rest: engraving convention
				// centers it horizontally (the formatter does the centering, see voiceTickables).
				alignCenter,
			});
			this.addDots(rest, lead);
			return rest;
		}
		if (lead.isGrace) {
			const grace = new GraceNote({
				keys: chord.notes.map((note) => this.vexflowKey(note)),
				duration,
				// Without this vexflow falls back to 'treble' and a grace on any other stave
				// lands at the wrong staff position — a bass-clef G3 grace drops below the
				// stave on ledger lines instead of sitting on the top space.
				clef,
				octaveShift,
				// slash="yes" on the <grace> element marks an acciaccatura (a stroke
				// through the stem/flag); its absence is a plain appoggiatura.
				slash: lead.graceSlash,
			});
			this.addAccidentals(grace, chord);
			return grace;
		}
		const staveNote = new NoteClass({
			keys: chord.notes.map((note) => this.vexflowKey(note)),
			duration,
			dots: lead.dots,
			clef,
			octaveShift,
			// No explicit <stem> and no voice default: let vexflow choose the direction
			// from staff position.
			autoStem: !lead.stem && !defaultStem,
		});
		this.addAccidentals(staveNote, chord);
		this.addParentheses(staveNote, chord);
		this.addDots(staveNote, lead);
		this.applyStem(staveNote, lead, defaultStem);
		this.addSlashNoteheads(staveNote, chord);
		this.notations.attach(staveNote, chord);
		return staveNote;
	}

	/*
	 * The MusicXML color attributes a note carries, laid over the configured notation ink:
	 * <note color> covers everything the note draws, while <notehead color> and <stem color>
	 * each name one piece and win over it.
	 *
	 * Called from the draw pass rather than at build time because it has to run after the
	 * beams: joining a note into a Beam resets its stem direction, and vexflow rebuilds that
	 * note's noteheads from scratch when it does, dropping any style set before.
	 * ponytail: <beam color> and <lyric color> are ignored — a beam and a syllable each draw
	 * from their own element, so they'd need their own pass. No fixture asks for them yet.
	 */
	applyNoteColors(staveNote: StaveNote, chord: Chord): void {
		const lead = chord.lead;
		const noteColor = lead.color;
		if (noteColor) {
			staveNote.setStyle({ fillStyle: noteColor, strokeStyle: noteColor });
			staveNote.setLedgerLineStyle({ strokeStyle: noteColor });
		}
		chord.notes.forEach((note, index) => {
			const color = note.notehead?.color ?? note.color;
			if (color) {
				staveNote.noteHeads[index]?.setStyle({
					fillStyle: color,
					strokeStyle: color,
				});
			}
		});
		// The stem takes its color directly: vexflow's Metrics hand every Stem a hardcoded
		// strokeStyle, so it never inherits the note's ink (see the draw pass, which restyles
		// stems for the same reason).
		const stemColor = lead.stemColor ?? noteColor;
		if (stemColor) {
			staveNote.getStem()?.setStyle({ strokeStyle: stemColor });
		}
	}

	/*
	 * A note's vexflow key, e.g. C#5 -> 'c/5'. An <unpitched> percussion note has no pitch at
	 * all — its <display-step>/<display-octave> pair names the staff position instead, which is
	 * how a kick, a snare and a hi-hat read as three different rows under one percussion clef.
	 * A harmonic appends the '/H' diamond code; a <notehead> with a supported alternate glyph
	 * appends its code (see NOTEHEAD_SUFFIX), which is how those three rows also get their own
	 * head shapes. Rests have neither; callers handle them.
	 */
	private vexflowKey(note: Note): string {
		const pitch = note.pitch;
		const key = pitch
			? `${pitch.step.toLowerCase()}/${pitch.octave}`
			: this.displayKey(note.unpitched);
		if (!key) {
			return 'b/4';
		}
		if (note.isHarmonic) {
			return `${key}/H`;
		}
		const notehead = note.notehead;
		if (!notehead) {
			return key;
		}
		const filled = notehead.filled;
		const fill = filled === null ? null : NOTEHEAD_FILL_SUFFIX[notehead.value];
		const suffix =
			(fill && (filled ? fill.filled : fill.open)) ??
			NOTEHEAD_SUFFIX[notehead.value];
		return suffix ? `${key}/${suffix}` : key;
	}

	/*
	 * The vexflow key a <display-step>/<display-octave> pair names, e.g. 'e/4'. Both <rest> and
	 * <unpitched> carry the pair, and in both it is a staff POSITION rather than a pitch — it
	 * says which line or space to draw the glyph on, not what sounds.
	 */
	private displayKey(
		at: { step: string; octave: number } | null,
	): string | null {
		return at ? `${at.step.toLowerCase()}/${at.octave}` : null;
	}

	/*
	 * A pitched rest's vexflow key, e.g. <display-step>E</display-step><display-octave>4 ->
	 * 'e/4'. Pinning a rest to a chosen line instead of the default centered one is standard in
	 * multi-voice writing, where the voices' rests are pushed apart. null when the rest carries
	 * no display position.
	 */
	private pitchedRestKey(note: Note): string | null {
		return this.displayKey(note.restPosition);
	}

	/*
	 * Stack each chord member's printed <accidental> onto its notehead. A dead/muted note
	 * (X notehead) has no definite pitch, so a printed accidental on it is meaningless —
	 * skip it. (Transcription exports sometimes emit one anyway; on a grace note it also
	 * collides with the cross glyph instead of sitting clear to its left.)
	 *
	 * A tie-stop note is the same sounding pitch as its tie-start: the accidental was already
	 * declared there and carries over, so skip it even when the MusicXML redundantly repeats it.
	 *
	 * A cautionary (reminder) accidental is wrapped in round parentheses and an editorial one in
	 * square brackets — the two conventional "this is not from the composer" marks. Both flags
	 * on one accidental take the brackets only, rather than nesting one wrapper inside the other.
	 */
	private addAccidentals(staveNote: StaveNote, chord: Chord): void {
		chord.notes.forEach((note, i) => {
			// A dead note prints no pitch, and a tied-into one isn't re-struck, so neither
			// carries an accidental.
			if (note.notehead?.value === 'x' || this.isHeld(note)) {
				return;
			}
			const printed = note.accidental;
			const code = printed && ACCIDENTAL_CODES[printed.value];
			if (!printed || !code) {
				return;
			}
			// An editorial accidental prints the same as an explicit bracket="yes".
			const bracket = printed.bracket || printed.editorial;
			// vexflow only knows the parenthesized (cautionary) form, so brackets are drawn by
			// handing it a composed glyph string as the code: it passes through an unrecognized
			// code verbatim, which measures and renders the same way the real ones do. Wrapping
			// a throwaway Accidental's resolved text avoids a second name -> glyph map here.
			const accidental = new Accidental(
				bracket
					? ACCIDENTAL_BRACKET_LEFT +
							new Accidental(code).getText() +
							ACCIDENTAL_BRACKET_RIGHT
					: code,
			);
			if (!bracket && (printed.cautionary || printed.parentheses)) {
				accidental.setAsCautionary();
			}
			staveNote.addModifier(accidental, i);
		});
	}

	/*
	 * Wrap each parenthesized chord member's notehead in round brackets. Per-member (like
	 * accidentals) rather than Parenthesis.buildAndAttach, which brackets every notehead.
	 */
	private addParentheses(staveNote: StaveNote, chord: Chord): void {
		chord.notes.forEach((note, i) => {
			if (note.notehead?.parentheses) {
				staveNote.addModifier(new Parenthesis(Modifier.Position.LEFT), i);
				staveNote.addModifier(new Parenthesis(Modifier.Position.RIGHT), i);
			}
		});
	}

	private addDots(staveNote: StaveNote, note: Note): void {
		for (let i = 0; i < note.dots; i++) {
			Dot.buildAndAttach([staveNote], { all: true });
		}
	}

	/*
	 * Honor an explicit <stem>up|down (e.g. to separate two voices on one stave), or
	 * <stem>none (bare noteheads, as in a rhythm/chord chart). Absent, fall back to the
	 * voice's default direction (multi-voice staves stem apart even when the exporter
	 * omits <stem>, e.g. Soundslice), else auto-pick from staff position (see
	 * staveNote's auto_stem).
	 */
	private applyStem(
		staveNote: StaveNote,
		note: Note,
		defaultStem?: 'up' | 'down',
	): void {
		switch (note.stem ?? defaultStem) {
			case 'up':
				staveNote.setStemDirection(Stem.UP);
				break;
			case 'down':
				staveNote.setStemDirection(Stem.DOWN);
				break;
			case 'none':
				// vexflow gates the stem on glyphProps.stem and the flag on glyphProps.codeFlagUp,
				// so clearing both drops each. Replace the object rather than mutating it: it can
				// be the shared entry from vexflow's duration table (see Note.getGlyphProps).
				// ponytail: <stem>double is left alone — no double stems in vexflow.
				staveNote.glyphProps = {
					...staveNote.glyphProps,
					stem: false,
					codeFlagUp: undefined,
				};
				break;
		}
	}

	/*
	 * Replace each slash-head chord member's glyph with the SMuFL slash bar. Must run AFTER
	 * applyStem: setStemDirection rebuilds the noteheads from scratch and would wipe the override.
	 * ponytail: beamed slash notes lose this (the Beam resets stem direction, hence the heads,
	 * after construction) — add a post-beam re-apply in spanner-builder if that case shows up.
	 */
	private addSlashNoteheads(staveNote: StaveNote, chord: Chord): void {
		const byDuration =
			SLASH_GLYPHS[this.durations.code(chord.lead)] ?? SLASH_GLYPH_FILLED;
		const noteHeads = staveNote.noteHeads;
		chord.notes.forEach((note, i) => {
			if (note.notehead?.value !== 'slash') {
				return;
			}
			const filled = note.notehead?.filled ?? null;
			let text = byDuration;
			if (filled === true) {
				text = SLASH_GLYPH_FILLED;
			} else if (filled === false) {
				text = SLASH_GLYPH_OPEN;
			}
			noteHeads[i]?.setText(text);
		});
	}
}
