import { type Chord, MElement, type Note } from '@stringsync/mdom';
import {
	Accidental,
	Dot,
	GraceNote,
	Modifier,
	Parenthesis,
	StaveNote,
	type StaveNoteStruct,
	Stem,
	VexFlow,
} from 'vexflow/core';
import { AlteredUnisonNote } from './altered-unison-note';
import { Appearance } from './appearance';
import { ChordDot } from './chord-dot';
import { STAVE_LINE_DISTANCE } from './constants';
import { isCueSized } from './cue-note';
import type { DurationTranslator } from './duration-translator';
import { isDiamondHarmonic } from './harmonic-kind';
import { InvisibleStaveNote } from './invisible-stave-note';
import { LowerVoiceDot } from './lower-voice-dot';
import { stemFromKeyLines } from './middle-line-stem';
import type { NotationTranslator } from './notation-translator';
import { NoteheadText } from './notehead-text';
import type { NoteStyle, ScoreReader } from './score-reader';
import { UnisonAccidental } from './unison-accidental';
import { VexmlGraceNote } from './vexml-grace-note';
import { VexmlStaveNote } from './vexml-stave-note';

type VexmlNote = VexmlStaveNote | VexmlGraceNote;

/*
 * Translates one mdom chord (a lead note plus any <chord/> members) to the vexflow StaveNote
 * that draws it: its keys, noteheads, accidentals, dots, stem, and (in a later pass, once the
 * beams are settled) its colors. What hangs OFF the note once it exists (articulations,
 * ornaments, lyrics) is NotationTranslator's half.
 */
export class ChordTranslator {
	// Each note's vexflow key, spelled once: the layout and both draw passes build every note.
	private readonly keys = new Map<Note, string>();
	// Each clef's middle-line key (see middleKey).
	private readonly middleKeys = new Map<string, string>();

	private appearance = Appearance.NONE;

	constructor(
		private readonly durations: DurationTranslator,
		private readonly notations: NotationTranslator,
		private readonly reader: ScoreReader,
	) {}

	useAppearance(appearance: Appearance): void {
		this.appearance = appearance;
	}

	/* The held tail of a tie: the note sounds on, but nothing about it is struck again. */
	private isHeld(note: Chord['notes'][number]): boolean {
		return this.reader.tiesOf(note).some((tie) => tie.tieType === 'stop');
	}

	/*
	 * Build a vexflow StaveNote for one chord (a lead note plus any <chord/> members;
	 * a single note is a one-member chord). Rests render as a centered rest glyph;
	 * grace notes (no <duration>) become small GraceNotes, slashed for an
	 * acciaccatura, which VoiceTranslator.tickables groups onto their host note; pitched
	 * notes stack their keys and carry each member's printed accidental, dots, stem
	 * direction, and articulations.
	 */
	staveNote(chord: Chord, clef: string, opts: VexflowChordOptions): StaveNote {
		const { octaveShift = 0 } = opts;
		const lead = chord.lead;
		// A hidden note builds as an InvisibleStaveNote: same formatting, no glyphs drawn.
		// ponytail: hiding is read off the lead only, so a chord with a mix of hidden and
		// visible members draws all of them; add per-notehead hiding if a fixture needs it.
		// A note a <beat-repeat> or <slash> stands in for is hidden the same way.
		const visible = lead.printObject && !opts.styled?.hidden;
		const NoteClass = visible ? VexmlStaveNote : InvisibleStaveNote;
		if (lead.isRest) {
			const cue = visible && isCueSized(lead);
			const struct = this.struct(chord, clef, opts);
			const rest = cue ? new VexmlGraceNote(struct) : new NoteClass(struct);
			this.dressRest(rest);
			this.hideSpacing(rest, lead);
			this.attachSign(rest, opts);
			this.addDots(rest, lead);
			this.notations.attachRest(rest, chord);
			return rest;
		}
		if (lead.isGrace) {
			// Behind Bars pp. 126–127: single-voice grace notes always stem up regardless of
			// stave position, while on a multi-voice stave the lower voice takes down-stems
			// (via defaultStem). An explicit <stem> in the MusicXML still wins.
			const direction = this.stemOf(lead, opts.defaultStem);
			const grace = new VexmlGraceNote({
				keys: chord.notes.map((note) => this.vexflowKey(note)),
				duration: this.durations.code(lead),
				// Without this vexflow falls back to 'treble' and a grace on any other stave
				// lands at the wrong staff position: a bass-clef G3 grace drops below the
				// stave on ledger lines instead of sitting on the top space.
				clef,
				octaveShift,
				// slash="yes" on the <grace> element marks an acciaccatura (a stroke
				// through the stem/flag); its absence is a plain appoggiatura.
				slash: lead.graceSlash,
				stemDirection: direction ? STEM[direction] : Stem.UP,
			});
			this.addAccidentals(grace, chord);
			this.hideNoneNoteheads(grace, chord);
			this.notations.attachGrace(grace, chord);
			return grace;
		}
		// A cue note is a GraceNote that keeps its duration: vexflow sizes the head, stem,
		// flag, dots and accidentals of that category at two thirds, and a grace group is
		// only formed by VoiceTranslator for notes mdom calls grace.
		const struct = this.struct(chord, clef, opts);
		const cue = visible && isCueSized(lead);
		const stemless =
			lead.stem === 'none' || !StaveNote.getGlyphProps(struct.duration).stem;
		const groups =
			visible && !opts.slashed && !cue ? alteredUnisons(chord) : [];
		let staveNote: VexmlNote;
		if (cue) {
			staveNote = new VexmlGraceNote(struct);
		} else if (stemless && groups.length > 0) {
			staveNote = new AlteredUnisonNote(struct, groups);
		} else {
			staveNote = new NoteClass(struct);
		}
		this.hideSpacing(staveNote, lead);
		this.attachSign(staveNote, opts);
		if (opts.slashed) {
			// Rhythmic slash notation: one slash on the middle line, carrying no pitch to spell.
			staveNote.noteHeads[0]?.setText(this.slashGlyph(chord));
		} else {
			staveNote.keyAlters = chord.notes.map((note) => note.pitch?.alter);
			this.addAccidentals(staveNote, chord, groups, opts);
			if (staveNote instanceof AlteredUnisonNote) {
				staveNote.calcNoteDisplacements();
			}
			this.addParentheses(staveNote, chord);
			this.addLevel(staveNote, chord);
			this.addNoteheadText(staveNote, chord);
		}
		this.addDots(
			staveNote,
			lead,
			!opts.multipleVoices,
			!!opts.multipleVoices && staveNote.getStemDirection() === Stem.DOWN,
		);
		if (
			visible &&
			!cue &&
			!opts.multipleVoices &&
			chord.notes.length === 1 &&
			StaveNote.getGlyphProps(struct.duration).codeFlagUp === undefined &&
			Dot.getDots(staveNote).length > 0
		) {
			// VexFlow starts right-hand modifiers 2 px past the head. Reserve the
			// rest of the half-space in the first-dot indent so formatting sees it
			// and the intervals between successive dots stay the same.
			staveNote.extraDotGap = Math.max(
				0,
				(opts.staffSpace ?? STAVE_LINE_DISTANCE) / 2 - 2,
			);
		}
		this.hideLedgerLines(staveNote, lead);
		this.applyStemNone(staveNote, lead);
		this.shortenOutwardStem(staveNote, lead);
		this.extendFlaggedStem(staveNote, lead);
		this.extendTiedFlaggedStem(staveNote, chord);
		if (!opts.slashed) {
			this.hideNoneNoteheads(staveNote, chord);
			this.addSlashNoteheads(staveNote, chord);
		}
		this.notations.attach(staveNote, chord);
		return staveNote;
	}

	/* The beat sign a hidden note draws where it sits (see ScoreReader.noteStyleOf). */
	private attachSign(staveNote: StaveNote, opts: VexflowChordOptions): void {
		if (staveNote instanceof InvisibleStaveNote && opts.styled?.sign) {
			staveNote.sign = opts.styled.sign;
		}
	}

	/*
	 * A quarter rest in the document's quarter-rest glyph. Set as the key's own glyph code, the
	 * one a notehead is rebuilt from, so it survives the formatter moving the rest (setKeyLine
	 * rebuilds the heads).
	 */
	private dressRest(rest: StaveNote): void {
		const glyph = this.appearance.glyph('quarter-rest');
		const key = rest.keyProps[0];
		if (
			glyph !== null &&
			key &&
			rest.glyphProps.codeHead === VexFlow.Glyphs.restQuarter
		) {
			key.code = glyph;
			rest.reset();
		}
	}

	/* print-spacing="no" on a hidden note: it draws nothing and the measure closes up around it. */
	private hideSpacing(staveNote: StaveNote, note: Note): void {
		if (
			staveNote instanceof InvisibleStaveNote &&
			note.getAttribute('print-spacing') === 'no'
		) {
			staveNote.spacingHidden = true;
		}
	}

	/*
	 * The staff line of each key the chord's StaveNote would hold (vexflow's keyProps lines,
	 * 0 the bottom line), without building it: what a beam group's stem direction is decided
	 * from before its notes exist. Grace notes have none (they never join a main beam).
	 */
	keyLines(chord: Chord, clef: string, opts: VexflowChordOptions): number[] {
		if (chord.lead.isGrace) {
			return [];
		}
		const {
			keys,
			clef: keyClef,
			octaveShift = 0,
		} = this.struct(chord, clef, opts);
		// vexflow's own key -> line rule (StaveNote.calculateKeyProps), minus the octave
		// shift it applies there: seven half-line steps an octave.
		return keyLines(keys, keyClef, octaveShift);
	}

	/*
	 * The StaveNote constructor settings for a rest or a pitched chord, stem included. The
	 * stem direction goes in here rather than through setStemDirection afterwards: vexflow
	 * rebuilds every notehead on each setStemDirection, so a note built with its direction
	 * builds them once.
	 */
	private struct(
		chord: Chord,
		clef: string,
		opts: VexflowChordOptions,
	): StaveNoteStruct & { keys: string[]; clef?: string } {
		const { alignCenter = false, octaveShift = 0, defaultStem, stem } = opts;
		const lead = chord.lead;
		const duration = this.durations.code(lead);
		// Pass `dots` to the constructor so vexflow counts the dot(s) in the note's ticks
		// (Dot.buildAndAttach only draws the glyph, it never changes duration). Without it
		// a dotted note is one tick-position short and its voice falls out of alignment
		// with the others sharing the stave.
		if (lead.isRest) {
			const restKey = this.pitchedRestKey(lead);
			// A whole rest hangs from the fourth line (d/5 in vexflow's clef-independent
			// default treble coordinates), while a half rest sits on the middle line (b/4)
			// and a breve rest fills the space above it (Behind Bars pp. 34-35).
			return {
				keys: [
					restKey ??
						(defaultStem ? VOICE_REST_KEY[defaultStem] : undefined) ??
						(duration === 'w' ? 'd/5' : 'b/4'),
				],
				duration: `${duration}r`,
				dots: this.reader.dotsOf(lead),
				// Only a display position resolves against the clef. The 'b/4' default and the
				// voice offsets around it are vexflow's centered line and must stay
				// clef-independent, or every bass-stave rest would jump to where B4 sits in
				// that clef.
				clef: restKey ? clef : undefined,
				// A whole rest alone in a measure is a full-measure rest: engraving convention
				// centers it horizontally (the formatter does the centering, see VoiceTranslator.tickables).
				alignCenter,
				// A rest stems up unless its beam group or explicit <stem> settled otherwise.
				stemDirection: (() => {
					const explicit =
						lead.stem === 'up' || lead.stem === 'down' ? lead.stem : undefined;
					const direction = stem ?? explicit;
					return direction ? STEM[direction] : undefined;
				})(),
			};
		}
		// A rhythm slash stems up unless written otherwise: its head always sits on the
		// middle line, where vexflow's own rule would turn it down.
		const keys = opts.slashed
			? [this.middleKey(clef)]
			: chord.notes.map((note) => this.vexflowKey(note));
		let direction = opts.slashed
			? (this.stemOf(lead, defaultStem) ?? 'up')
			: (stem ?? this.stemOf(lead, defaultStem));
		// A majority can only break the tie with at least three heads.
		if (!direction && !lead.stem && keys.length >= 3) {
			direction = stemFromKeyLines(keyLines(keys, clef, octaveShift));
		}
		return {
			keys,
			duration,
			dots: this.reader.dotsOf(lead),
			clef,
			octaveShift,
			stemDirection: direction ? STEM[direction] : undefined,
			// No direction from anywhere: let vexflow choose it from staff position.
			autoStem: !direction && !lead.stem,
		};
	}

	/*
	 * Honor an explicit <stem>up|down (e.g. to separate two voices on one stave). Absent, fall
	 * back to the voice's default direction (multi-voice staves stem apart even when the
	 * exporter omits <stem>), else none: the caller auto-picks from staff position. A written
	 * <stem>none or double has no direction either, and vexflow's default up stands.
	 */
	private stemOf(
		note: Note,
		defaultStem?: 'up' | 'down',
	): 'up' | 'down' | undefined {
		if (note.stem === 'up' || note.stem === 'down') {
			return note.stem;
		}
		return note.stem ? undefined : defaultStem;
	}

	/*
	 * The MusicXML color attributes a note carries, laid over the configured notation ink:
	 * <note color> covers everything the note draws, while <notehead color> and <stem color>
	 * each name one piece and win over it.
	 *
	 * Called from the draw pass rather than at build time because it has to run after the
	 * beams: joining a note into a Beam resets its stem direction, and vexflow rebuilds that
	 * note's noteheads from scratch when it does, dropping any style set before.
	 * ponytail: <beam color> and <lyric color> are ignored: a beam and a syllable each draw
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
	 * all: its <display-step>/<display-octave> pair names the staff position instead, which is
	 * how a kick, a snare and a hi-hat read as three different rows under one percussion clef.
	 * A harmonic appends the '/H' diamond code; a <notehead> with a supported alternate glyph
	 * appends its code (see NOTEHEAD_SUFFIX), which is how those three rows also get their own
	 * head shapes. Rests have neither; callers handle them.
	 */
	private vexflowKey(note: Note): string {
		let key = this.keys.get(note);
		if (key === undefined) {
			key = this.spellKey(note);
			this.keys.set(note, key);
		}
		return key;
	}

	private spellKey(note: Note): string {
		const pitch = note.pitch;
		const key = pitch
			? `${pitch.step.toLowerCase()}/${pitch.octave}`
			: this.displayKey(note.unpitched);
		if (!key) {
			return 'b/4';
		}
		if (isDiamondHarmonic(note, this.reader)) {
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
			this.noteheadSuffix(note, notehead.value);
		return suffix ? `${key}/${suffix}` : key;
	}

	/*
	 * The vexflow key suffix for a <notehead> with no explicit `filled` attribute.
	 * Half and whole cross heads take the thin-circled cross (X3, noteheadCircleX)
	 * so longer durations stay distinct from solid crosses (Behind Bars, p. 12).
	 */
	private noteheadSuffix(note: Note, value: string): string | undefined {
		if (value === 'x') {
			const code = this.durations.code(note);
			if (code === 'h' || code === 'w') {
				return 'X3';
			}
		}
		return NOTEHEAD_SUFFIX[value];
	}

	/*
	 * The vexflow key a <display-step>/<display-octave> pair names, e.g. 'e/4'. Both <rest> and
	 * <unpitched> carry the pair, and in both it is a staff POSITION rather than a pitch: it
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
	 * (X notehead) has no definite pitch, so a printed accidental on it is meaningless;
	 * skip it. (Transcription exports sometimes emit one anyway; on a grace note it also
	 * collides with the cross glyph instead of sitting clear to its left.)
	 *
	 * A tie-stop note is the same sounding pitch as its tie-start: the accidental was already
	 * declared there and carries over, so skip it inside a system even when the MusicXML
	 * redundantly repeats it. When the tied-into note opens a new system, Behind Bars p. 80
	 * repeats the accidental so the reader need not look back to the previous system: honor
	 * an explicit <accidental> if present, otherwise print a plain sign whenever the note's
	 * alteration differs from the new system's key signature.
	 *
	 * A cautionary (reminder) accidental is wrapped in round parentheses and an editorial one in
	 * square brackets: the two conventional "this is not from the composer" marks. Both flags
	 * on one accidental take the brackets only, rather than nesting one wrapper inside the other.
	 */
	private addAccidentals(
		staveNote: StaveNote,
		chord: Chord,
		groups: readonly number[][] = [],
		opts: Pick<VexflowChordOptions, 'opensSystem' | 'keyAlters'> = {},
	): void {
		const entries = chord.notes.map((note, index) => ({ note, index }));
		if (staveNote instanceof AlteredUnisonNote) {
			// On the same staff line, the formatter places the first sign nearest
			// the head. Read the resulting row from natural through flat to sharp.
			entries.sort(
				(a, b) => compactAccidentalRank(b.note) - compactAccidentalRank(a.note),
			);
		}
		entries.forEach(({ note, index: i }) => {
			// A dead note prints no pitch, and a tied-into one isn't re-struck, so it carries
			// no accidental inside a system (only when it opens a new system).
			const held = this.isHeld(note);
			if (note.notehead?.value === 'x' || (held && !opts.opensSystem)) {
				return;
			}
			const printed = this.reader.accidentalOf(note);
			const group = groups.find((members) => members.includes(i));
			const pitch = note.pitch;
			let code = group && pitch ? UNISON_ACCIDENTALS[pitch.alter] : undefined;
			if (printed) {
				code =
					printed.value === 'other'
						? smuflGlyph(printed.getAttribute('smufl'))
						: ACCIDENTAL_CODES[printed.value];
			} else if (
				held &&
				pitch &&
				pitch.alter !== (opts.keyAlters?.get(pitch.step) ?? 0)
			) {
				code = UNISON_ACCIDENTALS[pitch.alter];
			}
			if (!code) {
				return;
			}
			// An editorial accidental prints the same as an explicit bracket="yes".
			const bracket = printed?.bracket || printed?.editorial;
			// vexflow only knows the parenthesized (cautionary) form, so brackets are drawn by
			// handing it a composed glyph string as the code: it passes through an unrecognized
			// code verbatim, which measures and renders the same way the real ones do. Wrapping
			// a throwaway Accidental's resolved text avoids a second name -> glyph map here.
			const glyph = bracket
				? ACCIDENTAL_BRACKET_LEFT +
					new Accidental(code).getText() +
					ACCIDENTAL_BRACKET_RIGHT
				: code;
			const accidental = group
				? new UnisonAccidental(glyph)
				: new Accidental(glyph);
			if (!bracket && (printed?.cautionary || printed?.parentheses)) {
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

	/*
	 * <level parentheses="yes"> or bracket="yes": the editorial mark wraps every head of the
	 * chord, in round parentheses or square brackets (the brackets win when both are set).
	 * A head already parenthesized by its <notehead> keeps just that pair.
	 */
	private addLevel(staveNote: StaveNote, chord: Chord): void {
		const level = chord.lead.child('level');
		const bracket = level?.getAttribute('bracket') === 'yes';
		if (!level || (!bracket && level.getAttribute('parentheses') !== 'yes')) {
			return;
		}
		chord.notes.forEach((note, i) => {
			if (!bracket && note.notehead?.parentheses) {
				return;
			}
			for (const position of [
				Modifier.Position.LEFT,
				Modifier.Position.RIGHT,
			]) {
				const mark = new Parenthesis(position);
				if (bracket) {
					mark.setText(
						position === Modifier.Position.LEFT
							? NOTEHEAD_BRACKET_LEFT
							: NOTEHEAD_BRACKET_RIGHT,
					);
				}
				staveNote.addModifier(mark, i);
			}
		});
	}

	/* print-leger="no": the notehead sits off the stave without its ledger lines. */
	private hideLedgerLines(staveNote: VexmlNote, note: Note): void {
		if (note.getAttribute('print-leger') === 'no') {
			staveNote.ledgerLinesShown = false;
		}
	}

	/*
	 * <notehead-text>: its <display-text> and <accidental-text> runs, in order, centered in the
	 * member's notehead. mdom has no typed view of it, so it is read off the raw note.
	 */
	private addNoteheadText(staveNote: StaveNote, chord: Chord): void {
		chord.notes.forEach((note, i) => {
			const runs = note.child('notehead-text')?.children ?? [];
			const text = runs
				.filter((run): run is MElement => run instanceof MElement)
				.map((run) => this.noteheadRun(run))
				.join('');
			if (text) {
				staveNote.addModifier(new NoteheadText(text), i);
			}
		});
	}

	/* A run's text: <display-text> as written, <accidental-text> (a MusicXML accidental name)
	 * as the sign it names, or the name itself when it has no plain text sign. */
	private noteheadRun(run: MElement): string {
		const text = run.text ?? '';
		return run.tag === 'accidental-text'
			? (ACCIDENTAL_SIGNS[text] ?? text)
			: text;
	}

	private addDots(
		staveNote: StaveNote,
		note: Note,
		placeAdjacentRows = false,
		lowerVoice = false,
	): void {
		// print-dot="no" keeps the duration but draws no augmentation dot.
		if (note.getAttribute('print-dot') === 'no') {
			return;
		}
		const count = this.reader.dotsOf(note);
		if (
			count > 0 &&
			staveNote.keys.length > 1 &&
			ChordDot.attach(staveNote, count, placeAdjacentRows)
		) {
			return;
		}
		if (count > 0 && lowerVoice) {
			LowerVoiceDot.attach(staveNote, count);
			return;
		}
		for (let i = 0; i < count; i++) {
			Dot.buildAndAttach([staveNote], { all: true });
		}
	}

	/*
	 * <stem>none: bare noteheads, as in a rhythm/chord chart. vexflow gates the stem on
	 * glyphProps.stem and the flag on glyphProps.codeFlagUp, so clearing both drops each.
	 * Replace the object rather than mutating it: it can be the shared entry from vexflow's
	 * duration table (see Note.getGlyphProps).
	 * ponytail: <stem>double is left alone: no double stems in vexflow.
	 */
	private applyStemNone(staveNote: StaveNote, note: Note): void {
		if (note.stem === 'none') {
			staveNote.glyphProps = {
				...staveNote.glyphProps,
				stem: false,
				codeFlagUp: undefined,
			};
		}
	}

	/*
	 * Behind Bars pp. 14-15: stems pointing away from the stave (e.g. in two-part writing or
	 * wide chords) shorten progressively as the note nearest the open end moves outside the
	 * stave, from 3½ to 3 to 2½ stave-spaces, never shorter than 2½. Notes with two or more
	 * tails (16th and shorter) keep the full stem for flag room; beamed notes are sized by
	 * their Beam; grace/cue notes keep their scaled stems.
	 */
	private shortenOutwardStem(staveNote: StaveNote, note: Note): void {
		if (
			staveNote instanceof GraceNote ||
			!staveNote.hasStem() ||
			note.beams.length > 0 ||
			(staveNote.getBeamCount() ?? 0) > 1
		) {
			return;
		}
		const lines = staveNote.getKeyProps().map((k) => k.line);
		if (lines.length === 0) {
			return;
		}
		const direction = staveNote.getStemDirection();
		const outside =
			direction === Stem.UP
				? Math.max(...lines) - TOP_LINE
				: BOTTOM_LINE - Math.min(...lines);
		if (outside <= 0) {
			return;
		}
		const minSpaces = staveNote.hasFlag()
			? MIN_FLAGGED_OUTWARD_STEM_SPACES
			: MIN_OUTWARD_STEM_SPACES;
		const spaces = Math.max(minSpaces, STANDARD_STEM_SPACES - 0.5 * outside);
		staveNote.setStemLength(spaces * (Stem.HEIGHT / STANDARD_STEM_SPACES));
		staveNote.getStem()?.setExtension(staveNote.getStemExtension());
	}

	/*
	 * Behind Bars pp. 15-16 (with the ledger-line house-style decision in ledger/decisions.md):
	 * eighth and sixteenth stems stay 3½ spaces while each further tail lengthens the stem by
	 * glyphProps.stemBeamExtension. StaveNote.getStemExtension() adds the beyond-middle-line
	 * reach on top of this override, so ledger-line 8th/16th stems stop at the middle line and
	 * 32nd/64th extend past it by the extra-flag increment.
	 */
	private extendFlaggedStem(staveNote: StaveNote, note: Note): void {
		if (
			staveNote instanceof GraceNote ||
			!staveNote.hasStem() ||
			!staveNote.hasFlag() ||
			note.beams.length > 0
		) {
			return;
		}
		const extraFlagPx = staveNote.glyphProps.stemBeamExtension ?? 0;
		if (extraFlagPx <= 0) {
			return;
		}
		staveNote.setStemLength(Stem.HEIGHT + extraFlagPx);
		staveNote.getStem()?.setExtension(staveNote.getStemExtension());
	}

	/*
	 * Behind Bars p. 61 (tie-flag-clear): a flagged chord with a starting tie on the stem side
	 * lengthens its stem so the flag clears the outer tie. A space note's chord tie sits half a
	 * space further off its head than a line note's (see DashedTie.offHead), so it takes half a
	 * space more stem.
	 */
	private extendTiedFlaggedStem(staveNote: StaveNote, chord: Chord): void {
		if (
			staveNote instanceof GraceNote ||
			!staveNote.hasStem() ||
			!staveNote.hasFlag() ||
			chord.lead.beams.length > 0 ||
			!this.hasStemSideTieStart(chord, staveNote.getStemDirection())
		) {
			return;
		}
		const lines = staveNote.getKeyProps().map((k) => k.line);
		if (lines.length === 0) {
			return;
		}
		const outerLine =
			staveNote.getStemDirection() === Stem.UP
				? Math.max(...lines)
				: Math.min(...lines);
		const tieClearSpaces = Number.isInteger(outerLine)
			? TIED_FLAG_LINE_EXTENSION_SPACES
			: TIED_FLAG_SPACE_EXTENSION_SPACES;
		const extraFlagPx = staveNote.glyphProps.stemBeamExtension ?? 0;
		const targetLength =
			Stem.HEIGHT +
			extraFlagPx +
			tieClearSpaces * (Stem.HEIGHT / STANDARD_STEM_SPACES);
		const currentLength = staveNote.getStemLength();
		if (currentLength >= targetLength) {
			return;
		}
		// Subtract VexFlow's middle-line reach, which getStemExtension() adds back on top of
		// setStemLength(), so the final stem lands at targetLength rather than overshooting.
		const reach = Math.max(0, currentLength - (Stem.HEIGHT + extraFlagPx));
		staveNote.setStemLength(targetLength - reach);
		staveNote.getStem()?.setExtension(staveNote.getStemExtension());
	}

	/* Whether any note of `chord` starts a tie that bows on the same side as its stem/flag. */
	private hasStemSideTieStart(chord: Chord, stemDirection: number): boolean {
		const heads = chord.notes.length;
		const middle = (heads - 1) / 2;
		const stemSide = stemDirection === Stem.UP ? -1 : 1;
		return chord.notes.some((note, index) =>
			this.reader.tiesOf(note).some((tie) => {
				if (tie.tieType !== 'start') {
					return false;
				}
				const orientation = tie.getAttribute('orientation');
				let direction: number;
				if (orientation === 'over') {
					direction = -1;
				} else if (orientation === 'under') {
					direction = 1;
				} else if (heads > 1 && index !== middle) {
					direction = index > middle ? -1 : 1;
				} else {
					direction = -stemSide;
				}
				return direction === stemSide;
			}),
		);
	}

	/*
	 * Replace each slash-head chord member's glyph with the SMuFL slash bar. A later
	 * setStemDirection would rebuild the noteheads from scratch and wipe the override, which is
	 * why every stem direction, a beam group's included, is settled at construction.
	 */
	/* The slash notehead for the chord's duration: open for a half or whole, else filled. */
	private slashGlyph(chord: Chord): string {
		return SLASH_GLYPHS[this.durations.code(chord.lead)] ?? SLASH_GLYPH_FILLED;
	}

	/* The key on the middle line of `clef`, where a rhythm slash sits whatever the pitch. */
	private middleKey(clef: string): string {
		let key = this.middleKeys.get(clef);
		if (key === undefined) {
			key =
				MIDDLE_KEY_CANDIDATES.find(
					(candidate) =>
						VexFlow.keyProperties(candidate, clef).line === MIDDLE_LINE,
				) ?? 'b/4';
			this.middleKeys.set(clef, key);
		}
		return key;
	}

	/* <notehead>none</notehead>: omit the head glyph while keeping stems, beams, and modifiers. */
	private hideNoneNoteheads(staveNote: VexmlNote, chord: Chord): void {
		const hidden = new Set<number>();
		chord.notes.forEach((note, i) => {
			if (note.notehead?.value === 'none') {
				hidden.add(i);
			}
		});
		if (hidden.size > 0) {
			staveNote.hiddenNoteHeads = hidden;
		}
	}

	private addSlashNoteheads(staveNote: StaveNote, chord: Chord): void {
		const byDuration = this.slashGlyph(chord);
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

/* Keep perfect unisons on the ordinary path. Within one written pitch, only the
 * altered members need a left-to-right chromatic order. */
function alteredUnisons(chord: Chord): number[][] {
	const pitches = new Map<string, { index: number; alter: number }[]>();
	chord.notes.forEach((note, index) => {
		const pitch = note.pitch;
		if (pitch) {
			const key = `${pitch.step}/${pitch.octave}`;
			const members = pitches.get(key) ?? [];
			members.push({ index, alter: pitch.alter });
			pitches.set(key, members);
		}
	});
	return [...pitches.values()]
		.filter((members) =>
			members.some(({ alter }) => alter !== members[0]?.alter),
		)
		.map((members) =>
			members.sort((a, b) => a.alter - b.alter).map(({ index }) => index),
		);
}

function compactAccidentalRank(note: Note): number {
	const alter = note.pitch?.alter ?? 0;
	return alter === 0 ? -2 : Math.sign(alter);
}

const UNISON_ACCIDENTALS: Readonly<Record<number, string>> = {
	[-3]: '\uE266',
	[-2]: 'bb',
	[-1.5]: 'db',
	[-1]: 'b',
	[-0.5]: 'd',
	0: 'n',
	0.5: '+',
	1: '#',
	1.5: '++',
	2: '##',
	3: '\uE265',
};

const ACCIDENTAL_SIGNS: Readonly<Record<string, string>> = {
	sharp: '\u266F',
	flat: '\u266D',
	natural: '\u266E',
};

/*
 * MusicXML <accidental> glyph name -> vexflow accidental code. Forms with no vexflow code
 * (the courtesy forms, the arrows, the triples, the Turkish commas) pass their SMuFL glyph
 * straight through: Tables.accidentalCodes returns an unrecognized code verbatim, and
 * the accidental is drawn in the music font either way. The -up/-down values are the
 * Gould arrow quarter-tone glyphs (U+E270-E27B), which SMuFL lays out one per MusicXML
 * value. `other` has no entry: its glyph is named only by @smufl, resolved by smuflGlyph.
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
	'sharp-down': '\uE275', // accidentalQuarterToneSharpArrowDown
	'sharp-up': '\uE274', // accidentalThreeQuarterTonesSharpArrowUp
	'natural-down': '\uE273', // accidentalQuarterToneFlatNaturalArrowDown
	'natural-up': '\uE272', // accidentalQuarterToneSharpNaturalArrowUp
	'flat-down': '\uE271', // accidentalThreeQuarterTonesFlatArrowDown
	'flat-up': '\uE270', // accidentalQuarterToneFlatArrowUp
	'double-sharp-down': '\uE277', // accidentalThreeQuarterTonesSharpArrowDown
	'double-sharp-up': '\uE276', // accidentalFiveQuarterTonesSharpArrowUp
	'flat-flat-down': '\uE279', // accidentalFiveQuarterTonesFlatArrowDown
	'flat-flat-up': '\uE278', // accidentalThreeQuarterTonesFlatArrowUp
	'arrow-down': '\uE27B', // accidentalArrowDown
	'arrow-up': '\uE27A', // accidentalArrowUp
	'triple-sharp': '\uE265', // accidentalTripleSharp
	'triple-flat': '\uE266', // accidentalTripleFlat
	'slash-quarter-sharp': '+-', // accidentalKucukMucennebSharp
	'slash-sharp': '++-', // accidentalBuyukMucennebSharp
	'slash-flat': 'bs', // accidentalBakiyeFlat
	'double-slash-flat': 'bss', // accidentalBuyukMucennebFlat
	'sharp-1': '\uE450', // accidental1CommaSharp
	'sharp-2': '\uE451', // accidental2CommaSharp
	'sharp-3': '\uE452',
	'sharp-5': '\uE453', // accidental5CommaSharp
	'flat-1': '\uE454',
	'flat-2': '\uE455', // accidental2CommaFlat
	'flat-3': '\uE456', // accidental3CommaFlat
	'flat-4': '\uE457', // accidental4CommaFlat
	sori: 'o',
	koron: 'k',
};

/*
 * A SMuFL glyph name (<accidental smufl="accidentalWilsonPlus">) -> its codepoint, from
 * vexflow's Glyphs table. An unknown or missing name draws nothing rather than throwing.
 */
export function smuflGlyph(name: string | null): string | undefined {
	const glyphs: Record<string, string> = VexFlow.Glyphs;
	return name ? glyphs[name] : undefined;
}

/* The settings ChordTranslator.staveNote applies to one chord. */
interface VexflowChordOptions {
	/* Center the glyph in the measure, as a whole-measure rest is drawn. */
	alignCenter?: boolean;
	/* Space between staff lines, in pixels, for both width planning and drawing. */
	staffSpace?: number;
	/* Voices sharing this staff need their dots placed in relation to one another. */
	multipleVoices?: boolean;
	/* <clef-octave-change>: shifts every notehead's staff position by that many octaves
	 * (e.g. -1 for a treble-8vb guitar clef draws sounding pitches an octave higher).
	 * vexflow's own StaveNote option; keys stay at their sounding octave. */
	octaveShift?: number;
	/* Stem direction for notes without an explicit <stem>, set when multiple voices
	 * share the stave (voice 1 up, the rest down) so the voices stem apart. */
	defaultStem?: 'up' | 'down';
	/* The direction the note's beam group settled on, which wins over both of the above: a
	 * beam stems its notes one way (see VoiceTranslator.tickables, VoiceBuilder.planStems). */
	stem?: 'up' | 'down';
	/* Under a <slash use-stems="yes">: a slash notehead on the middle line in place of the
	 * chord's pitches, its rhythm and stem kept (see ScoreReader.isRhythmSlashed). */
	slashed?: boolean;
	/* Under a <beat-repeat> or <slash> sign: hidden, and maybe the one that draws the sign. */
	styled?: NoteStyle;
	/* This chord opens a new system (beat 0 of a measure starting system > 0), so a tied-into
	 * note repeats its accidental (Behind Bars p. 80). */
	opensSystem?: boolean;
	/* The new system's opening key signature alterations by step, used when a tied-into note
	 * opening a new system omits an explicit <accidental>. */
	keyAlters?: ReadonlyMap<string, number>;
}

const STEM = { up: Stem.UP, down: Stem.DOWN } as const;

function keyLines(
	keys: readonly string[],
	clef: string | undefined,
	octaveShift: number,
): number[] {
	return keys.map(
		(key) => VexFlow.keyProperties(key, clef).line - 3.5 * octaveShift,
	);
}

// vexflow's staff lines for a five-line stave (keyProperties counts C4 in treble as 0).
const BOTTOM_LINE = 1;
const MIDDLE_LINE = 3;
const TOP_LINE = 5;
const STANDARD_STEM_SPACES = 3.5;
const MIN_OUTWARD_STEM_SPACES = 2.5;
// Bravura's single flag is ~3 spaces tall; Behind Bars p. 16 lengthens a stem shorter than
// 3 spaces when a longer tail would otherwise overshoot the notehead.
const MIN_FLAGGED_OUTWARD_STEM_SPACES = 3;
// Behind Bars p. 61: extra stem length to lift a chord's flag clear of a stem-side tie.
const TIED_FLAG_LINE_EXTENSION_SPACES = 1;
const TIED_FLAG_SPACE_EXTENSION_SPACES = 1.5;
// Every natural from C2 to B5: one of them sits on the middle line of any clef vexflow has.
const MIDDLE_KEY_CANDIDATES = [2, 3, 4, 5].flatMap((octave) =>
	['c', 'd', 'e', 'f', 'g', 'a', 'b'].map((step) => `${step}/${octave}`),
);

// Raw SMuFL codepoints (accidentalBracketLeft, accidentalBracketRight) because vexflow has no
// bracketed accidental of its own (see ChordTranslator.addAccidentals).
const NOTEHEAD_BRACKET_LEFT = '\uE26C';
const NOTEHEAD_BRACKET_RIGHT = '\uE26D';
const ACCIDENTAL_BRACKET_LEFT = '\uE26C';
const ACCIDENTAL_BRACKET_RIGHT = '\uE26D';

// Slash noteheads (see NoteReader.isSlashNotehead) follow the notehead convention: a whole or
// half is hollow (noteheadSlashWhiteWhole, noteheadSlashWhiteHalf) and anything shorter solid
// (noteheadSlashVerticalEnds). filled="no" borrows the hollow half head, since SMuFL has no
// hollow slash for the shorter values.
export const SLASH_GLYPHS: Record<string, string> = {
	w: '\uE102',
	h: '\uE103',
};
export const SLASH_GLYPH_FILLED = '\uE100';
const SLASH_GLYPH_OPEN = '\uE103';

/*
 * MusicXML <notehead> value -> vexflow key-suffix glyph code, appended to the key so vexflow
 * draws the alternate head (see vexflowKey). These codes go through vexflow's codeNoteHead, which
 * picks the duration-appropriate variant (open for half/whole, filled for quarter and shorter),
 * except 'x' (cross heads): black values take the bare X2, while half and whole values are routed
 * to the circled cross X3 in noteheadSuffix. Values vexflow has no
 * glyph for (cross, the plus-shaped head) are absent and keep the default oval; `none` is
 * omitted by hideNoneNoteheads, and `slash` is redrawn post-build by addSlashNoteheads.
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
