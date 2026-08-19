import type { Chord, Clef, Lyric, Note, Technical } from '@stringsync/mdom';
import {
	Accidental,
	Annotation,
	Articulation,
	Barline,
	BarNote,
	Bend,
	ClefNote,
	Dot,
	Element,
	GhostNote,
	GraceNote,
	GraceNoteGroup,
	GraceTabNote,
	Modifier,
	Ornament,
	Parenthesis,
	StaveNote,
	Stem,
	type StemmableNote,
	Stroke,
	TabNote,
	Tremolo,
	Vibrato,
	Voice,
} from 'vexflow';
import type { TabStemPlacement } from './config';
import {
	EPSILON,
	GRACE_SPACING,
	TAB_FRET_SCALE,
	TAB_GRACE_SCALE,
	TAB_GRACE_SPACING,
} from './constants';
import { LyricAnnotation } from './lyric-mark/lyric-annotation';
import {
	FingeringAnnotation,
	StringNumberAnnotation,
} from './technical-mark/technical-annotation';

// MusicXML <type> -> vexflow duration code; rests append 'r'.
const DURATION_CODES: Record<string, string> = {
	whole: 'w',
	half: 'h',
	quarter: 'q',
	eighth: '8',
	'16th': '16',
	'32nd': '32',
	'64th': '64',
	'128th': '128',
};

// Quarter-note beats -> vexflow duration code, for a note that omits <type> (see durationCode).
const BEAT_CODES: [beats: number, code: string][] = [
	[4, 'w'],
	[2, 'h'],
	[1, 'q'],
	[0.5, '8'],
	[0.25, '16'],
	[0.125, '32'],
	[0.0625, '64'],
	[0.03125, '128'],
];

/*
 * A note's vexflow duration code. <type> is optional in MusicXML — Finale omits it on the
 * rests it inserts to hold a voice open — so fall back to the note's own <duration>, which
 * is what makes a typeless bar-filling rest a whole rest instead of a quarter. An
 * unrecognized type, or a duration matching no plain note value, falls back to 'q'.
 * ponytail: only exact powers of two match, so a bar-filling rest in 3/4 (3 beats) still
 * comes out a quarter. Map the measure's own beat count to 'w' if that case turns up.
 */
function durationCode(lead: Note): string {
	if (lead.type) {
		return DURATION_CODES[lead.type] ?? 'q';
	}
	const beats = lead.beats;
	if (beats === null) {
		return 'q';
	}
	return BEAT_CODES.find(([b]) => Math.abs(b - beats) < EPSILON)?.[1] ?? 'q';
}

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

// SMuFL brackets around an editorial accidental (see addAccidentals).
const ACCIDENTAL_BRACKET_LEFT = '\uE26C'; // accidentalBracketLeft
const ACCIDENTAL_BRACKET_RIGHT = '\uE26D'; // accidentalBracketRight

/*
 * A <harmonic> in this note's <notations><technical>: drawn as a diamond notehead on a
 * notation stave (see vexflowKey) and as an angle-bracketed fret on tab (see tabPositions).
 */
function isHarmonic(note: Note): boolean {
	return note.isHarmonic;
}

/*
 * A <notehead>x</notehead>: an X-shaped notehead (a dead/muted note), drawn as a cross on a
 * notation stave (see vexflowKey) and as an "X" in place of the fret on tab (see tabPositions).
 */
function isXNotehead(note: Note): boolean {
	return note.notehead?.value === 'x';
}

/*
 * A <notehead parentheses="yes">: a ghost/optional note, drawn with round brackets around the
 * notehead on a notation stave (see addParentheses) and the fret wrapped in "()" on tab (see
 * tabPositions).
 */
function isParenthesized(note: Note): boolean {
	return note.notehead?.parentheses ?? false;
}

/*
 * A <notehead>slash</notehead>: a rhythm-slash head, drawn as an oblique bar in place of the
 * oval. vexflow has no key-suffix for it (unlike '/X2' for the X head), so addSlashNoteheads
 * overrides the glyph after the StaveNote is built. SMuFL: open bar for whole/half, filled for
 * quarter and shorter — matching vexflow's own duration split for X/diamond heads.
 */
function isSlashNotehead(note: Note): boolean {
	return note.notehead?.value === 'slash';
}

// SMuFL slash-notehead glyphs by duration code (see isSlashNotehead).
const SLASH_GLYPHS: Record<string, string> = {
	w: '\uE102', // noteheadSlashWhiteWhole
	h: '\uE103', // noteheadSlashWhiteHalf
};
const SLASH_GLYPH_FILLED = '\uE100'; // noteheadSlashVerticalEnds
const SLASH_GLYPH_OPEN = '\uE103'; // noteheadSlashWhiteHalf, for filled="no"

/*
 * Replace each slash-head chord member's glyph with the SMuFL slash bar. Must run AFTER
 * applyStem: setStemDirection rebuilds the noteheads from scratch and would wipe the override.
 * ponytail: beamed slash notes lose this (the Beam resets stem direction, hence the heads,
 * after construction) — add a post-beam re-apply in spanner-builder if that case shows up.
 */
function addSlashNoteheads(staveNote: StaveNote, chord: Chord): void {
	const byDuration =
		SLASH_GLYPHS[durationCode(chord.lead)] ?? SLASH_GLYPH_FILLED;
	const noteHeads = staveNote.noteHeads;
	chord.notes.forEach((note, i) => {
		if (!isSlashNotehead(note)) {
			return;
		}
		const filled = note.notehead?.filled ?? null;
		noteHeads[i]?.setText(
			filled === null
				? byDuration
				: filled
					? SLASH_GLYPH_FILLED
					: SLASH_GLYPH_OPEN,
		);
	});
}

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
 * The vexflow key a <display-step>/<display-octave> pair names, e.g. 'e/4'. Both <rest> and
 * <unpitched> carry the pair, and in both it is a staff POSITION rather than a pitch — it
 * says which line or space to draw the glyph on, not what sounds.
 */
function displayKey(
	at: { step: string; octave: number } | null,
): string | null {
	return at ? `${at.step.toLowerCase()}/${at.octave}` : null;
}

/*
 * A note's vexflow key, e.g. C#5 -> 'c/5'. An <unpitched> percussion note has no pitch at
 * all — its <display-step>/<display-octave> pair names the staff position instead, which is
 * how a kick, a snare and a hi-hat read as three different rows under one percussion clef.
 * A harmonic appends the '/H' diamond code; a <notehead> with a supported alternate glyph
 * appends its code (see NOTEHEAD_SUFFIX), which is how those three rows also get their own
 * head shapes. Rests have neither; callers handle them.
 */
function vexflowKey(note: Note): string {
	const pitch = note.pitch;
	const key = pitch
		? `${pitch.step.toLowerCase()}/${pitch.octave}`
		: displayKey(note.unpitched);
	if (!key) {
		return 'b/4';
	}
	if (isHarmonic(note)) {
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
 * A pitched rest's vexflow key, e.g. <display-step>E</display-step><display-octave>4 ->
 * 'e/4'. Pinning a rest to a chosen line instead of the default centered one is standard in
 * multi-voice writing, where the voices' rests are pushed apart. null when the rest carries
 * no display position.
 */
function pitchedRestKey(note: Note): string | null {
	return displayKey(note.restPosition);
}

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

/*
 * The MusicXML <bar-style> values vexflow's own Barline draws. Its Barline knows four
 * non-repeat types and MusicXML names nine, so the rest (dotted, dashed, heavy, tick, …)
 * have no type here and are painted by DrawPass.paintBarStyle. 'regular' is the plain
 * single line, the style an absent <bar-style> means.
 */
export const BAR_STYLE_TYPES: Record<string, number> = {
	regular: Barline.type.SINGLE,
	'light-light': Barline.type.DOUBLE,
	'light-heavy': Barline.type.END,
	none: Barline.type.NONE,
};

/** The width a mid-measure divider with no vexflow type of its own reserves, matching the
 * SINGLE barline it is painted in place of. */
const CUSTOM_MID_BAR_WIDTH = 8;

/** What a vexflow voice holds: its notes/rests/ghosts, plus the zero-duration BarNotes and
 * ClefNotes a mid-measure `<barline>` or `<clef>` puts between them. */
export type VoiceTickable = StemmableNote | BarNote | ClefNote;

/** One mid-measure `<clef>` change, resolved to what vexflow draws and positions notes
 * against. See ScoreReader.midClefsOf. */
export type MidClefSpec = {
	beat: number;
	clef: string;
	annotation: string | undefined;
};

/**
 * A vexflow BarNote for a mid-measure `<barline>`: a zero-duration tickable the formatter
 * places between the notes it divides, so the measure widens to hold it instead of the line
 * landing on a notehead. A style vexflow can't draw becomes an invisible bar of the same
 * width, painted over by the draw pass (see DrawPass.paintBarStyle).
 */
export function midBarNote(style: string): BarNote {
	const type = BAR_STYLE_TYPES[style];
	if (type === undefined) {
		return new BarNote(Barline.type.NONE).setWidth(CUSTOM_MID_BAR_WIDTH);
	}
	return new BarNote(type);
}

/* The duration codes that draw a flag, and so can carry a beam instead. */
const FLAGGED_DURATIONS = new Set(['8', '16', '32', '64', '128']);

/*
 * Whether a cluster of grace notes beams: two or more of them, all of flagged value. A run of
 * small notes is beamed together whether or not the exporter wrote <beam> markers — both
 * MuseScore and LilyPond engrave lilypond_24d's unmarked 16th cluster with a beam — so the
 * markers only matter for telling a beamed run from a genuinely flagged one, which no
 * fixture writes.
 */
function beamsGraceGroup(graces: ReadonlyArray<{ lead: Note }>): boolean {
	return (
		graces.length > 1 &&
		graces.every((g) => FLAGGED_DURATIONS.has(durationCode(g.lead)))
	);
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
export function applyNoteColors(staveNote: StaveNote, chord: Chord): void {
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

function addDots(staveNote: StaveNote, note: Note): void {
	for (let i = 0; i < note.dots; i++) {
		Dot.buildAndAttach([staveNote], { all: true });
	}
}

/*
 * MusicXML <articulations> name -> the notehead-side mark it draws: a vexflow articulation
 * code, or an [above, below] pair of raw SMuFL glyphs for the marks vexflow has no code for
 * (Articulation passes an unrecognized code through as the glyph, the same way Accidental
 * does). vexflow's own codes carry both faces already, so they need no pair.
 */
const ARTICULATION_CODES: Record<
	string,
	string | [above: string, below: string]
> = {
	staccato: 'a.',
	accent: 'a>',
	tenuto: 'a-',
	staccatissimo: 'av',
	'strong-accent': 'a^',
	'detached-legato': ['\uE4B2', '\uE4B3'], // articTenutoStaccatoAbove/Below
	spiccato: ['\uE4A8', '\uE4A9'], // articStaccatissimoWedgeAbove/Below
	stress: ['\uE4B6', '\uE4B7'], // articStressAbove/Below
	unstress: ['\uE4B8', '\uE4B9'], // articUnstressAbove/Below
};

/*
 * Marks that name a moment in the bar rather than a way of playing the note. They sit
 * above the staff whichever way the stem points, so they're outside the notehead-side rule.
 */
const MEASURE_MARK_GLYPHS: Record<string, string> = {
	'breath-mark': '\uE4CE', // breathMarkComma
	caesura: '\uE4D1', // caesura
};

/*
 * The jazz brush strokes: a stroke off the side of the notehead rather than a mark above or
 * below it. vexflow models these as Ornaments and takes the side from the ornament's name —
 * scoop and plop lead INTO the note (drawn left), doit and falloff off it (drawn right) — so
 * plop borrows scoop's name for the placement and swaps in its own SMuFL glyph.
 */
const BRUSH_ORNAMENTS: Record<string, { type: string; glyph?: string }> = {
	scoop: { type: 'scoop' },
	plop: { type: 'scoop', glyph: '\uE5E0' }, // brassPlop
	doit: { type: 'doit' },
	falloff: { type: 'fall' },
};

/*
 * An articulation that clears the beam.
 *
 * vexflow parks a stem-side mark half a stave space off the STEM TIP, which on a beamed note
 * is exactly where the beam's ink starts — half a space of air reads as clearance over a thin
 * stem, but as a mark resting on the beam. Lift it another space when the note is beamed,
 * which is roughly what MuseScore engraves. The beam extends AWAY from the mark (down from a
 * stem-up tip), so its thickness costs nothing and the beam count doesn't matter.
 *
 * Applied by shifting the text line for the duration of the draw rather than at format time:
 * vexflow's Articulation.format has no view of the beam, and a note can be drawn more than
 * once (the spill pass), so a persistent bump would ratchet.
 */
class StaveArticulation extends Articulation {
	override draw(): void {
		const note = this.checkAttachedNote();
		const onStemTip =
			this.position ===
			(note.getStemDirection() === Stem.UP
				? Modifier.Position.ABOVE
				: Modifier.Position.BELOW);
		if (!note.hasBeam() || !onStemTip) {
			super.draw();
			return;
		}
		const line = this.textLine;
		this.setTextLine(line + 1);
		super.draw();
		this.setTextLine(line);
	}
}

/*
 * An articulation that sits opposite the stem — BELOW for a stem-up note, ABOVE otherwise.
 *
 * The side isn't final when the mark is built: a beamed note's stem direction is only
 * settled once its Beam is, so the beam pass re-runs {@link setSide} (see
 * SpannerBuilder.reorientArticulations). vexflow's own codes flip their glyph on reset();
 * the raw SMuFL ones have to have the mirrored glyph swapped in, which is what the pair is
 * for. Fermatas take their side from their type instead, so they stay plain Articulations
 * and this pass leaves them alone.
 */
export class NoteheadArticulation extends StaveArticulation {
	private readonly codes: [above: string, below: string];

	constructor(code: string | [above: string, below: string]) {
		const codes: [string, string] =
			typeof code === 'string' ? [code, code] : code;
		super(codes[0]);
		this.codes = codes;
	}

	setSide(staveNote: StaveNote): this {
		const above = staveNote.getStemDirection() !== Stem.UP;
		this.setPosition(above ? Modifier.Position.ABOVE : Modifier.Position.BELOW);
		// setPosition resets the glyph off vexflow's own table, which mirrors the codes it
		// names. A raw SMuFL code has no mirror there, so swap in the other face by hand.
		const [aboveGlyph, belowGlyph] = this.codes;
		if (aboveGlyph !== belowGlyph) {
			this.setText(above ? aboveGlyph : belowGlyph);
		}
		return this;
	}
}

function addArticulations(staveNote: StaveNote, note: Note): void {
	for (const name of note.articulations) {
		const brush = BRUSH_ORNAMENTS[name];
		if (brush) {
			const ornament = new Ornament(brush.type);
			if (brush.glyph) {
				ornament.setText(brush.glyph);
			}
			staveNote.addModifier(ornament);
			continue;
		}
		const measureMark = MEASURE_MARK_GLYPHS[name];
		if (measureMark) {
			staveNote.addModifier(
				new StaveArticulation(measureMark).setPosition(Modifier.Position.ABOVE),
			);
			continue;
		}
		const code = ARTICULATION_CODES[name];
		if (code) {
			staveNote.addModifier(new NoteheadArticulation(code).setSide(staveNote));
		}
	}
}

/*
 * MusicXML <ornaments> child tag -> the vexflow Ornament type that draws it. Names vexflow
 * knows are used as-is; the rest hand it their SMuFL glyph, which Tables.ornamentCodes
 * passes through verbatim (the same escape hatch accidentals and articulations use).
 *
 * The two mordents read backwards on purpose. MusicXML's <mordent> is the sign WITH the
 * vertical stroke and <inverted-mordent> the one without it; vexflow names the stroked one
 * 'mordentInverted' and the plain one 'mordent'.
 *
 * A delayed turn draws the same glyph as its plain form, moved to sit between its note and
 * the next one — vexflow's own setDelayed does that, so the pair shares an entry here.
 */
const ORNAMENT_TYPES: Record<string, string> = {
	'trill-mark': 'tr',
	turn: 'turn',
	'delayed-turn': 'turn',
	'inverted-turn': '\uE568', // ornamentTurnInverted (vexflow's 'turnInverted' is the slashed one)
	'delayed-inverted-turn': '\uE568',
	shake: 'prallprall', // ornamentTremblement — the long trill wiggle
	mordent: 'mordentInverted',
	'inverted-mordent': 'mordent',
	schleifer: '\uE587', // ornamentSchleifer
};

/*
 * The ornament glyphs above a notehead: trills, turns, mordents, the schleifer, and the
 * slashes of a single-note <tremolo>.
 *
 * An <accidental-mark> is not an ornament of its own — it is the small sharp/flat drawn with
 * the ornament it follows (an F# turn), so it attaches to the last one built. MusicXML gives
 * each a placement, but the pair on a turn conventionally reads one above and one below, so
 * the first goes over the glyph and the second under it.
 * ponytail: <wavy-line> is left to the tab path (it becomes a Vibrato there). On a notation
 * stave a trill's extension line needs a start..stop spanner like buildWedges — add one when
 * a fixture needs the line rather than the "tr" alone.
 */
function addOrnaments(staveNote: StaveNote, note: Note): void {
	let last: Ornament | undefined;
	let accidentalMarks = 0;
	for (const ornament of note.ornaments) {
		if (ornament.ornamentType === 'accidental-mark') {
			const code = ACCIDENTAL_CODES[ornament.accidentalMark ?? ''];
			if (last && code) {
				if (accidentalMarks === 0) {
					last.setUpperAccidental(code);
				} else {
					last.setLowerAccidental(code);
				}
				accidentalMarks++;
			}
			continue;
		}
		if (ornament.ornamentType === 'tremolo') {
			// <tremolo type="single">N</tremolo>: N slashes through the stem.
			// ponytail: the type="start"/"stop" bowed-tremolo pair (slashes BETWEEN two notes)
			// is not handled — it needs a spanner, and no fixture reaches it yet.
			staveNote.addModifier(new Tremolo(ornament.tremoloMarks || 1));
			continue;
		}
		const type = ORNAMENT_TYPES[ornament.ornamentType];
		if (!type) {
			continue;
		}
		last = new Ornament(type);
		accidentalMarks = 0;
		if (ornament.ornamentType.startsWith('delayed-')) {
			last.setDelayed(true);
		}
		staveNote.addModifier(last);
	}
}

/*
 * MusicXML <notations><technical> mark -> the glyph it draws on a NOTATION stave: a vexflow
 * articulation code where one exists, else the raw SMuFL glyph (Articulation passes an
 * unrecognized code straight through, the same escape hatch accidentals and ornaments use).
 *
 * <harmonic> is deliberately absent: vexml already engraves it as a diamond notehead (see
 * isHarmonic, pinned by harmonic.musicxml), so drawing the "o" as well would mark it twice.
 * The tab-only members of <technical> — <bend>, <other-technical>, <string>/<fret> — belong
 * to addTabModifiers and tabPositions; the two that carry text (<fingering>, <pluck>) and
 * <string> on a notation stave are handled by {@link addTechnicals} instead.
 */
const TECHNICAL_CODES: Record<string, string> = {
	'up-bow': 'a|',
	'down-bow': 'am',
	'open-string': 'ah', // stringsHarmonic — the small open circle
	'snap-pizzicato': 'ao',
	stopped: 'a+', // pluckedLeftHandPizzicato — the "+" of a stopped horn / left-hand pizz
	'thumb-position': '\uE624', // stringsThumbPosition
	'double-tongue': '\uE5F0', // doubleTongueAbove
	'triple-tongue': '\uE5F2', // tripleTongueAbove
};

/*
 * The digits/letters one note's <fingering> and <pluck> elements print, joined into a single
 * label. A note usually carries one, but an editor offering a choice of hand positions writes
 * several: MusicXML marks a substitution (change fingers while the key is held) with
 * substitution="yes" and a second option with alternate="yes", which engrave as "5-3" and
 * "(2)" respectively. Empty elements — an exporter's placeholder — contribute nothing.
 */
function fingeringLabel(marks: Technical[]): string {
	let label = '';
	for (const mark of marks) {
		const text = mark.text?.trim();
		if (!text) {
			continue;
		}
		if (mark.alternate) {
			label += `(${text})`;
		} else if (label && mark.substitution) {
			label += `-${text}`;
		} else {
			label += label ? ` ${text}` : text;
		}
	}
	return label;
}

/*
 * A note's <notations><technical> marks on a NOTATION stave (the tab side lives in
 * addTabModifiers): the bowing/tonguing/pizzicato glyphs, the <fingering>/<pluck> labels,
 * and the <string> indicator.
 *
 * Fingerings are per chord MEMBER, so they read off the chord rather than its lead, and they
 * stack outward from the notes: the digit nearest the stave belongs to the chord member
 * nearest it. vexflow stacks a note's annotations in the order they're added, so an ABOVE
 * column is added bottom-member first and a BELOW column top-member first.
 *
 * String numbers are added after the fingerings so the circled number sits OUTSIDE the digit
 * it shares a note with, whichever order the two came in the file.
 * ponytail: <string> draws as vexflow's circled Arabic numeral (the guitar convention).
 * Bowed-string parts conventionally take Roman numerals instead — OSMD picks those — which
 * needs its own glyph and a way to know the instrument family. Add it if a fixture asks.
 */
function addTechnicals(staveNote: StaveNote, chord: Chord): void {
	const strings: { index: number; number: string; below: boolean }[] = [];
	const fingerings: { index: number; text: string; below: boolean }[] = [];
	chord.notes.forEach((note, index) => {
		const labels: Technical[] = [];
		let below = false;
		for (const mark of note.technicals) {
			if (mark.placement === 'below') {
				below = true;
			}
			if (
				mark.technicalType === 'fingering' ||
				mark.technicalType === 'pluck'
			) {
				labels.push(mark);
				continue;
			}
			if (mark.technicalType === 'string') {
				const number = mark.text?.trim();
				if (number) {
					strings.push({ index, number, below: mark.placement === 'below' });
				}
				continue;
			}
			const code = TECHNICAL_CODES[mark.technicalType];
			if (code) {
				staveNote.addModifier(
					new StaveArticulation(code).setPosition(
						mark.placement === 'below'
							? Modifier.Position.BELOW
							: Modifier.Position.ABOVE,
					),
					index,
				);
			}
		}
		const text = fingeringLabel(labels);
		if (text) {
			fingerings.push({ index, text, below });
		}
	});
	// Bottom-member first going up, top-member first going down — see the note above.
	for (const side of [false, true]) {
		const column = fingerings.filter((f) => f.below === side);
		if (side) {
			column.reverse();
		}
		for (const { index, text } of column) {
			staveNote.addModifier(new FingeringAnnotation(text, side), index);
		}
	}
	for (const { index, number, below } of strings) {
		staveNote.addModifier(new StringNumberAnnotation(number, below), index);
	}
}

/*
 * A <notations><fermata>: the held-note arc-over-dot. Default placement is above
 * (vexflow "a@a"); type="inverted" mirrors it below ("a@u"). Unlike articulations,
 * the side is the fermata's type, not the stem direction.
 */
function addFermata(staveNote: StaveNote, note: Note): void {
	const fermata = note.fermata;
	if (!fermata) {
		return;
	}
	const inverted = fermata === 'inverted';
	const articulation = new StaveArticulation(inverted ? 'a@u' : 'a@a');
	// Vexflow defaults every Articulation to ABOVE; the below-shaped glyph also needs the
	// BELOW position so it sits under the note instead of floating over it.
	articulation.setPosition(
		inverted ? Modifier.Position.BELOW : Modifier.Position.ABOVE,
	);
	staveNote.addModifier(articulation);
}

/*
 * A <notations><arpeggiate>: the wavy vertical line rolled down the left of a chord.
 * Drawn as a vexflow Stroke spanning every notehead (it reads the note's full y-range,
 * so attaching at index 0 covers the whole chord). MusicXML's direction is the arrow's
 * heading; vexflow names its roll types by the opposite end, so "up" (arrowhead up, at
 * the top) is ROLL_DOWN and "down" (arrowhead down, at the bottom) is ROLL_UP. An
 * undirected arpeggiate is a plain wiggle with no arrow (ARPEGGIO_DIRECTIONLESS).
 */
function addArpeggio(staveNote: StaveNote, note: Note): void {
	const arpeggiate = note.arpeggiate;
	if (!arpeggiate) {
		return;
	}
	const direction = arpeggiate.direction;
	const type =
		direction === 'up'
			? Stroke.Type.ROLL_DOWN
			: direction === 'down'
				? Stroke.Type.ROLL_UP
				: Stroke.Type.ARPEGGIO_DIRECTIONLESS;
	staveNote.addModifier(new Stroke(type), 0);
}

/* Stroke width of the non-arpeggiate bracket's spine and hooks, in pixels. */
const NON_ARPEGGIATE_THICKNESS = 1.5;

/*
 * The square bracket of a <notations><non-arpeggiate>, drawn to the left of a chord: a
 * vertical spine with a hook at each end, both pointing right at the noteheads. vexflow's
 * Stroke has no bracket type, so this subclasses it purely to inherit the placement —
 * Stroke.format reserves the width and shifts the whole stack clear of accidentals, and it
 * dispatches on CATEGORY, which a subclass keeps — and replaces the wiggle in draw().
 */
class NonArpeggioBracket extends Stroke {
	constructor(
		private readonly lowIndex: number,
		private readonly highIndex: number,
	) {
		// The type is never read (draw is overridden), but Stroke's constructor needs one.
		super(Stroke.Type.ARPEGGIO_DIRECTIONLESS);
	}

	override draw(): void {
		const ctx = this.checkContext();
		const note = this.checkAttachedNote();
		this.setRendered();
		// Only the noteheads the mark actually spans: a non-arpeggiate whose type="bottom"
		// and type="top" name inner members brackets that part of the chord alone.
		const ys = note
			.getYs()
			.slice(this.lowIndex, this.highIndex + 1)
			.filter((y) => Number.isFinite(y));
		if (ys.length === 0) {
			return;
		}
		const lineSpace = note.checkStave().getSpacingBetweenLines();
		// Overhang the outer noteheads by half a staff space, the way the arpeggio wiggle
		// does, so the bracket reads as enclosing them rather than touching them.
		const top = Math.min(...ys) - lineSpace / 2;
		const bottom = Math.max(...ys) + lineSpace / 2;
		const x =
			note.getModifierStartXY(this.position, this.index).x - 5 + this.xShift;
		const hook = lineSpace * 0.6;
		ctx.fillRect(x, top, NON_ARPEGGIATE_THICKNESS, bottom - top);
		ctx.fillRect(x, top, hook, NON_ARPEGGIATE_THICKNESS);
		ctx.fillRect(
			x,
			bottom - NON_ARPEGGIATE_THICKNESS,
			hook,
			NON_ARPEGGIATE_THICKNESS,
		);
	}
}

/*
 * A <notations><non-arpeggiate>: the bracket marking a chord to be struck together, the
 * explicit opposite of the arpeggio wiggle. MusicXML puts type="bottom" on the lowest
 * member it covers and type="top" on the highest, and the members between carry nothing —
 * so the range comes from the whole chord, not just the lead. A half-marked chord (only one
 * end present, which lilypond_32d's malformed neighbors produce) brackets from the end it
 * does name out to the edge of the chord rather than dropping the mark.
 */
function addNonArpeggiate(staveNote: StaveNote, chord: Chord): void {
	const types = chord.notes.map((note) => note.nonArpeggiate);
	const bottom = types.indexOf('bottom');
	const top = types.lastIndexOf('top');
	if (bottom < 0 && top < 0) {
		return;
	}
	staveNote.addModifier(
		new NonArpeggioBracket(
			bottom < 0 ? 0 : bottom,
			top < 0 ? chord.notes.length - 1 : top,
		),
		0,
	);
}

/*
 * Honor an explicit <stem>up|down (e.g. to separate two voices on one stave), or
 * <stem>none (bare noteheads, as in a rhythm/chord chart). Absent, fall back to the
 * voice's default direction (multi-voice staves stem apart even when the exporter
 * omits <stem>, e.g. Soundslice), else auto-pick from staff position (see
 * vexflowChord's auto_stem).
 */
function applyStem(
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
function addAccidentals(staveNote: StaveNote, chord: Chord): void {
	chord.notes.forEach((note, i) => {
		if (isXNotehead(note) || isTieStop(note)) {
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
function addParentheses(staveNote: StaveNote, chord: Chord): void {
	chord.notes.forEach((note, i) => {
		if (isParenthesized(note)) {
			staveNote.addModifier(new Parenthesis(Modifier.Position.LEFT), i);
			staveNote.addModifier(new Parenthesis(Modifier.Position.RIGHT), i);
		}
	});
}

/*
 * Attach a note's <lyric> verses as text under the stave, one annotation per verse in
 * verse order (verse 1 nearest the stave).
 *
 * A syllable that opens or continues a word ('begin'/'middle') carries a trailing hyphen
 * joining it to the next one: "Al-" "le-" "lu-" "ia".
 * ponytail: the hyphen rides on the syllable instead of being drawn centered in the gap
 * between the two — a centered hyphen needs a spanner across notes (and systems). The
 * melisma <extend/> flag is passed through for LyricPlacer.pin to draw.
 */
function addLyrics(staveNote: StaveNote, lead: Note): void {
	const verses = [...lead.lyrics].sort(
		(a, b) => Number(a.verse) - Number(b.verse),
	);
	verses.forEach((verse, index) => {
		const syllabic = verse.syllabic;
		const hyphen = syllabic === 'begin' || syllabic === 'middle' ? '-' : '';
		const text = syllableOf(verse) + hyphen;
		if (text) {
			staveNote.addModifier(new LyricAnnotation(text, index, verse.extend));
		}
	});
}

/*
 * A lyric's text with its <elision> separators kept. Lyric.syllable joins the <text> runs
 * with nothing between them, so an elided two-syllable lyric comes out "de" rather than
 * "d e". An empty <elision/> leaves the symbol to the renderer; a space is the conventional
 * pick and makes it read the same as the equivalent "d e" single-<text> spelling. An elision
 * carrying its own text (an undertie, an underscore) uses that instead.
 */
function syllableOf(verse: Lyric): string {
	// U+00A0, not a plain space: it must not be a line-break opportunity or collapse.
	return verse.runs
		.map((run) => run.text || (run.kind === 'elision' ? ' ' : ''))
		.join('');
}

/*
 * <bend-alter> in semitones -> the label drawn above the bend arrow. Guitar bends
 * are notated in whole steps: 2 semitones = "1", 1 = "½", 3 = "1½", 4 = "2".
 */
function bendLabel(semitones: number): string {
	const whole = Math.floor(semitones / 2);
	const half = semitones % 2 === 1 ? '½' : '';
	return whole > 0 ? `${whole}${half}` : half || '0';
}

/*
 * A tab-stave text Annotation (palm mute "P.M.", a dead-note "x", …), justified above
 * the fret numbers.
 */
function tabAnnotation(text: string, noteWidth: number): Annotation {
	const annotation = new Annotation(text).setVerticalJustification(
		Annotation.VerticalJustify.TOP,
	);
	// The fret glyph draws centered on the note's x (drawPositions: tabX = x - width/2), but the
	// formatter lands an ABOVE annotation half a note-width to the right of it. The modifier
	// formatter treats xShift as a leftward shift, so half a note-width re-centers the text over
	// the fret. (Centering is width-independent here, so the text font's measured width — narrow
	// in the notation-first stack — doesn't affect it.)
	annotation.setXShift(noteWidth / 2);
	return annotation;
}

/*
 * Attach the lead note's tablature articulations to its TabNote, reading straight
 * from <notations>: a <bend> (with optional <release/> for a bend-and-release),
 * free-text <other-technical>, and <ornaments><wavy-line> vibrato. All are vexflow
 * modifiers, so attaching them here means the layout pass — which also calls this —
 * sizes measures with the extra width they take. (A <harmonic> is drawn as an
 * angle-bracketed fret in tabPositions, not a modifier.)
 */
function addTabModifiers(tabNote: TabNote, lead: Note): void {
	const bend = lead.bend;
	if (bend) {
		const phrase = [{ type: Bend.UP, text: bendLabel(bend.semitones) }];
		// ponytail: a <release/> child draws a bend-then-release (up-down arrow); a
		// release to a non-zero target would need its own label — add when a fixture wants it.
		if (bend.release) {
			phrase.push({ type: Bend.DOWN, text: '' });
		}
		tabNote.addModifier(new Bend(phrase), 0);
	}
	const other = lead.otherTechnical[0];
	if (other) {
		const noteWidth = (tabNote as unknown as { width: number }).width;
		tabNote.addModifier(tabAnnotation(other, noteWidth), 0);
	}
	if (lead.wavyLines.some((w) => w.wavyLineType === 'start')) {
		tabNote.addModifier(new Vibrato(), 0);
	}
}

/*
 * Where a note sits on the fretboard when `<technical>` doesn't say. Some exporters give a
 * tab note only its pitch, leaving the string/fret to be derived from the staff tuning —
 * without this it would print fret 0 on string 1 no matter what it sounds.
 *
 * Pick the highest string the note is reachable on, i.e. the smallest non-negative fret:
 * that is the ordinary first-position fingering and matches what MuseScore derives. A note
 * below every open string is unplayable as written; put it on the lowest string at fret 0
 * rather than dropping it, so the tab still shows something at that tick.
 *
 * `tuning` is indexed by string - 1 (see stringTuning). An explicit `<string>` wins — only
 * its fret is derived — so a hand-fingered voicing keeps the string the editor chose.
 */
/* Semitones above C for each MusicXML <step>. */
const STEP_SEMITONES: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
};

/* MIDI number of a step/octave/alter, the common scale a pitch and a string's tuning compare on. */
function midiOf(step: string, octave: number, alter = 0): number {
	return (octave + 1) * 12 + (STEP_SEMITONES[step.toUpperCase()] ?? 0) + alter;
}

function derivePosition(
	note: Chord['notes'][number],
	tuning: number[],
): { str: number; fret: number } | null {
	const pitch = note.pitch;
	if (!pitch) {
		return null;
	}
	const midi = midiOf(pitch.step, pitch.octave, pitch.alter ?? 0);
	if (note.string != null) {
		const open = tuning[note.string - 1];
		return open == null
			? null
			: { str: note.string, fret: Math.max(0, midi - open) };
	}
	let best: { str: number; fret: number } | null = null;
	for (const [index, open] of tuning.entries()) {
		const fret = midi - open;
		if (fret >= 0 && (best === null || fret < best.fret)) {
			best = { str: index + 1, fret };
		}
	}
	return best ?? { str: tuning.length, fret: 0 };
}

/*
 * Each chord member's <string>/<fret> as a vexflow tab position (string 1 =
 * highest-pitched, an open string is fret 0). A natural harmonic is notated as the fret
 * in angle brackets, e.g. <12> — vexflow renders the fret string verbatim.
 *
 * A member with no <technical> carries only a pitch; `tuning` (the staff's
 * <staff-tuning>, null when it declares none) derives its string/fret — see
 * derivePosition.
 *
 * A tie-stop fret is the held tail of a tie: the string isn't re-struck, so guitar tab
 * convention omits its number (unlike a slur/hammer-on/pull-off, which changes fret and
 * is drawn). Filter those out; a wholly-held chord never reaches here — vexflowTabTickables
 * replaces it with a ghost note — but keep an all-members fallback so the grace path (which
 * also calls this) can never hand vexflow an empty position list.
 */
function tabPositions(chord: Chord, tuning: number[] | null) {
	const toPosition = (note: Chord['notes'][number]) => {
		const derived =
			tuning && note.fret == null ? derivePosition(note, tuning) : null;
		const fret = note.fret ?? derived?.fret ?? 0;
		// A dead note (<notehead>x</notehead>) prints "X" on its string instead of a fret;
		// a harmonic angle-brackets its fret. vexflow renders the fret string verbatim.
		let fretText: string | number = fret;
		if (isXNotehead(note)) {
			// A dingbat "✕" (U+2715), not an ASCII "X": the notation font (Bravura) draws an
			// ornate glyph for "X" and would win the CSS font fallthrough, but it lacks this
			// dingbat, so the fret falls through to the plain text font like the fret digits do.
			fretText = '✕';
		} else if (isHarmonic(note)) {
			fretText = `<${fret}>`;
		} else if (isParenthesized(note)) {
			// A ghost/optional fret reads as "(2)". vexflow renders the fret string verbatim.
			fretText = `(${fret})`;
		}
		return {
			str: note.string ?? derived?.str ?? 1,
			fret: fretText,
		};
	};
	const struck = chord.notes.filter((note) => !isTieStop(note));
	return (struck.length > 0 ? struck : chord.notes).map(toPosition);
}

/*
 * True when the note is the held tail of a tie (carries a tieType 'stop'). Such a string
 * isn't re-struck, so its fret is omitted from the tab.
 */
function isTieStop(note: Chord['notes'][number]): boolean {
	return note.ties.some((tie) => tie.tieType === 'stop');
}

type FretElement = Element & { fontWeight: string };

/*
 * Bold and enlarge a fret digit Element, re-centering it vertically on its string line.
 */
function boldFret(el: FretElement, scale: number): void {
	el.fontWeight = 'bold';
	el.setFontSize(el.fontSizeInPoints * scale);
	el.setYShift(el.getHeight() / 2);
}

/*
 * One thin (non-bold) angle bracket, sized to match the bolded digits it flanks. Mirrors
 * VexFlow's TabNote.tabToElement so it picks up the default 'TabNote.text' font. The +1
 * drops the bracket a pixel below dead-center so it sits optically level with the heavier
 * bold digits (the thin glyph otherwise reads as floating high).
 */
function harmonicBracket(glyph: '<' | '>', scale: number): Element {
	const el = new Element('TabNote.text');
	el.setText(glyph);
	el.setFontSize(el.fontSizeInPoints * scale);
	el.setYShift(el.getHeight() / 2 + 1);
	return el;
}

/*
 * A natural harmonic fret reads as "<12>": the angle brackets stay thin/unbolded while the
 * fret number inside is bold like an ordinary fret. VexFlow draws one fillText per Element,
 * so a single element can't mix weights — make the parent hold the bold digits and hang the
 * two thin brackets off it as child Elements (renderText draws children with their own
 * font). The pieces lay out left-to-right within the parent's reported width, which
 * drawPositions centers on the note x and clears the staff line behind.
 */
function styleHarmonicFret(el: FretElement, scale: number): void {
	const open = harmonicBracket('<', scale);
	const close = harmonicBracket('>', scale);
	el.setText(el.getText().replace(/[<>]/g, ''));
	boldFret(el, scale);
	const openWidth = open.getWidth();
	const digitsWidth = el.getWidth();
	open.setX(0);
	el.setXShift(openWidth);
	close.setX(openWidth + digitsWidth);
	el.addChild(open);
	el.addChild(close);
	// Set width last: any font/text change reinvalidates and would recompute it to the bare
	// digit width, dropping the brackets from centering and the cleared background.
	el.setWidth(openWidth + digitsWidth + close.getWidth());
}

/*
 * Restyle a TabNote's fret digits in place. VexFlow has no public API to set the
 * 'TabNote.text' metric globally (Metrics isn't exported), so override each fret Element
 * built in the constructor — fretElement is protected, hence the cast. Resizing rebuilds
 * each digit's vertical centering and the note width off the new glyphs so the formatter
 * reserves the right horizontal space. Grace notes pass a smaller scale.
 */
function styleFrets(
	tabNote: TabNote | GraceTabNote,
	scale = TAB_FRET_SCALE,
): void {
	const note = tabNote as unknown as {
		fretElement: FretElement[];
		width: number;
	};
	let width = 0;
	for (const el of note.fretElement) {
		if (el.getText().includes('<')) {
			styleHarmonicFret(el, scale);
		} else {
			boldFret(el, scale);
		}
		width = Math.max(el.getWidth(), width);
	}
	note.width = width;
}

/*
 * A grace TabNote (small fret numbers) for one grace chord, grouped onto the real
 * note it precedes by vexflowTabTickables. Frets are scaled to TAB_GRACE_SCALE of the
 * (already enlarged) main-note size so graces stay proportionally smaller.
 */
function vexflowTabGrace(chord: Chord, tuning: number[] | null): GraceTabNote {
	const duration = durationCode(chord.lead);
	const grace = new GraceTabNote({
		positions: tabPositions(chord, tuning),
		duration,
	});
	styleFrets(grace, TAB_FRET_SCALE * TAB_GRACE_SCALE);
	return grace;
}

// VexFlow duration code -> quarter-note beats, largest first.
const GHOST_DURATIONS: [code: string, beats: number][] = [
	['w', 4],
	['h', 2],
	['q', 1],
	['8', 0.5],
	['16', 0.25],
	['32', 0.125],
	['64', 0.0625],
	['128', 0.03125],
];

/*
 * Fill a timing gap (in quarter-note beats) with invisible GhostNotes: tickables
 * that reserve the gap's time but draw nothing, so a voice that starts late or has
 * an internal hole stays aligned with its sibling voices. Greedy largest-first;
 * MusicXML gaps are dyadic, so this lands exactly down to a 128th (the epsilon
 * guards float drift). ponytail: a non-dyadic gap (e.g. a lone tuplet-sized hole)
 * drops a sub-128th remainder — add tuplet ghosts if that ever shows up.
 */
function ghostNotes(beats: number): GhostNote[] {
	const ghosts: GhostNote[] = [];
	let remaining = beats;
	for (const [duration, value] of GHOST_DURATIONS) {
		while (remaining >= value - EPSILON) {
			ghosts.push(new GhostNote({ duration }));
			remaining -= value;
		}
	}
	return ghosts;
}

/* The settings NoteTranslator.vexflowChord applies to one chord. */
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

/* The settings NoteTranslator.vexflowVoiceTickables applies to one voice. */
export interface VexflowVoiceTickablesOptions {
	/* Pad the voice with ghost notes out to this beat, so an underfull measure still
	 * reserves the trailing space the meter asks for. */
	endBeat?: number;
	/* Called with each lead note and the StaveNote built for it, as they are built, so a
	 * caller can index them. */
	// rule-ignore objects-over-callbacks: this fires DURING the call, handing back what the
	// call is building, and one NoteTranslator is shared by the layout pass and the draw pass
	// (their measured and drawn widths have to match). An Events surface on it would deliver
	// the layout pass's notes to the draw pass's listener and back, which is the bug this
	// per-call collector cannot have.
	record?: (lead: Note, staveNote: StaveNote) => void;
	/* Per-note octave shift, since a mid-measure clef change can vary it note by note
	 * rather than it being one value for the stave. */
	octaveShiftOf?: (lead: Note) => number;
	/* Stem direction for notes without an explicit <stem>. */
	defaultStem?: 'up' | 'down';
	/* The measure's mid-measure dividers (see ScoreReader.midBarlinesOf), each inserted as
	 * a zero-duration BarNote just before the first note at or past its beat. */
	barlines?: readonly { beat: number; style: string }[];
	/* The measure's mid-measure clef changes (see ScoreReader.midClefsOf). Each one re-aims
	 * every LATER note's staff position. */
	midClefs?: readonly MidClefSpec[];
	/* Also emit the small ClefNote glyph for each midClef. Like a divider, the glyph belongs
	 * to the measure, so it rides on the first voice only. */
	drawMidClefs?: boolean;
}

/*
 * Translates mdom chords into vexflow tickables. One instance per render: the layout
 * (measuring) pass and the draw pass share it so both build their notes — and probe
 * font metrics — identically.
 */
export class NoteTranslator {
	// Whether/where TabNotes are built with stems (and flags). See Config.tabStemPlacement.
	constructor(private readonly tabStemPlacement: TabStemPlacement = 'none') {}

	/*
	 * MusicXML <clef> sign + line -> vexflow clef name. Covers the common signs;
	 * unknown combinations fall back to treble.
	 */
	vexflowClef(sign: string, line: number | null): string {
		switch (sign) {
			case 'F':
				return 'bass';
			case 'C':
				return line === 4 ? 'tenor' : 'alto';
			case 'percussion':
				return 'percussion';
			default:
				return 'treble';
		}
	}

	/*
	 * A clef's DRAWN identity: the vexflow clef name plus any octave annotation, or null
	 * when there is no clef. Two clefs that engrave to the same glyph share a signature
	 * (C/3 and C/5 are both 'alto'), so comparing signatures across measures spots a clef
	 * change that is actually visible instead of redrawing an identical glyph.
	 */
	vexflowClefSpec(clef: Clef | null): string | null {
		return clef
			? `${this.vexflowClef(clef.sign, clef.line)}|${this.vexflowClefAnnotation(clef.octaveChange) ?? ''}`
			: null;
	}

	/*
	 * ScoreReader.midClefsOf output resolved to what vexflow draws, so the layout and draw
	 * passes hand the tickable builder the same specs.
	 */
	midClefSpecs(
		changes: readonly { beat: number; clef: Clef }[],
	): MidClefSpec[] {
		return changes.map(({ beat, clef }) => ({
			beat,
			clef: this.vexflowClef(clef.sign, clef.line),
			annotation: this.vexflowClefAnnotation(clef.octaveChange),
		}));
	}

	/*
	 * MusicXML <clef-octave-change> -> vexflow clef annotation ('8va'/'8vb'), drawn as
	 * the small octave numeral above/below the clef glyph. vexflow only carries an octave
	 * annotation on G/F clefs, so ±2 (15ma/mb) and other clefs fall back to no annotation.
	 * ponytail: octave only; add 15ma/mb if a fixture ever needs it.
	 */
	vexflowClefAnnotation(octaveChange: number | null): string | undefined {
		if (octaveChange === 1) {
			return '8va';
		}
		if (octaveChange === -1) {
			return '8vb';
		}
		return undefined;
	}

	/*
	 * Build a vexflow StaveNote for one chord (a lead note plus any <chord/> members;
	 * a single note is a one-member chord). Rests render as a centered rest glyph;
	 * grace notes (no <duration>) become small GraceNotes — slashed for an
	 * acciaccatura — which vexflowVoiceTickables groups onto their host note; pitched
	 * notes stack their keys and carry each member's printed accidental, dots, stem
	 * direction, and articulations.
	 */
	private vexflowChord(
		chord: Chord,
		clef: string,
		opts: VexflowChordOptions = {},
	): StaveNote {
		const { alignCenter = false, octaveShift = 0, defaultStem } = opts;
		const lead = chord.lead;
		const duration = durationCode(lead);
		// A hidden note builds as an InvisibleStaveNote: same formatting, no glyphs drawn.
		// ponytail: hiding is read off the lead only, so a chord with a mix of hidden and
		// visible members draws all of them; add per-notehead hiding if a fixture needs it.
		const NoteClass = lead.printObject ? StaveNote : InvisibleStaveNote;
		// Pass `dots` to the constructor so vexflow counts the dot(s) in the note's ticks
		// (Dot.buildAndAttach only draws the glyph, it never changes duration). Without it
		// a dotted note is one tick-position short and its voice falls out of alignment
		// with the others sharing the stave.
		if (lead.isRest) {
			const restKey = pitchedRestKey(lead);
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
				// centers it horizontally (the formatter does the centering, see vexflowVoiceTickables).
				alignCenter,
			});
			addDots(rest, lead);
			return rest;
		}
		if (lead.isGrace) {
			const grace = new GraceNote({
				keys: chord.notes.map(vexflowKey),
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
			addAccidentals(grace, chord);
			return grace;
		}
		const staveNote = new NoteClass({
			keys: chord.notes.map(vexflowKey),
			duration,
			dots: lead.dots,
			clef,
			octaveShift,
			// No explicit <stem> and no voice default: let vexflow choose the direction
			// from staff position.
			autoStem: !lead.stem && !defaultStem,
		});
		addAccidentals(staveNote, chord);
		addParentheses(staveNote, chord);
		addDots(staveNote, lead);
		applyStem(staveNote, lead, defaultStem);
		addSlashNoteheads(staveNote, chord);
		addArticulations(staveNote, lead);
		addTechnicals(staveNote, chord);
		addOrnaments(staveNote, lead);
		addFermata(staveNote, lead);
		addArpeggio(staveNote, lead);
		addNonArpeggiate(staveNote, chord);
		addLyrics(staveNote, lead);
		return staveNote;
	}

	/*
	 * Build a vexflow TabNote for one chord on a tablature stave: each member's
	 * <string>/<fret> becomes a position (string 1 = highest-pitched). Tab notes carry
	 * no clef, accidentals, or stems — just the fret numbers stacked on their strings,
	 * plus any bend/vibrato/annotation modifiers from <notations>.
	 */
	private vexflowTabChord(chord: Chord, tuning: number[] | null): TabNote {
		const lead = chord.lead;
		const duration = durationCode(lead);
		const tabNote = new TabNote(
			{
				positions: tabPositions(chord, tuning),
				duration,
				// Count the dot(s) in the note's ticks (as the notation path does) so a dotted
				// tab note isn't a tick-position short and drift out of alignment with the
				// notation stave it's formatted against. Tab omits the drawn dot glyph.
				dots: lead.dots,
				stemDirection: this.tabStemPlacement === 'above' ? Stem.UP : Stem.DOWN,
			},
			this.tabStemPlacement !== 'none',
		);
		styleFrets(tabNote);
		addTabModifiers(tabNote, lead);
		return tabNote;
	}

	/*
	 * VexFlow draws a TabNote's fret digits — and the staff-line gap it clears behind them —
	 * centered on the note's start x, but a StaveNote anchors its notehead's LEFT edge there
	 * (the notehead's center sits half a glyph-width to the right). So a fret lines up under
	 * the notehead's left edge, not its center. SystemFormatter.formatAndDraw recenters by shifting the
	 * whole tab note area right by this; doing it there rather than via the fret's own xShift
	 * keeps the cleared gap moving with the digit (clearRect ignores xShift). The width is a
	 * font metric needing a live canvas, so probe it lazily off a throwaway StaveNote and
	 * cache the first non-zero read. The cache lives on this translator instance — one per
	 * render — so each render re-probes at most once against its own canvas.
	 */
	private noteheadHalfWidthCache = 0;

	noteheadHalfWidth(): number {
		if (this.noteheadHalfWidthCache === 0) {
			this.noteheadHalfWidthCache =
				new StaveNote({ keys: ['c/4'], duration: 'q' }).getGlyphWidth() / 2;
		}
		return this.noteheadHalfWidthCache;
	}

	/*
	 * A tab voice's tickables: one TabNote per non-rest chord, in onset order. Grace
	 * chords steal no time, so like vexflowVoiceTickables they're held aside and
	 * attached to the next real note as a GraceNoteGroup modifier (drawn just left of
	 * it). A rest reserves its duration with invisible GhostNotes rather than a drawn
	 * rest glyph (tab convention omits rests) — without that reserved time, a tab note
	 * after a rest slides left and falls out of vertical alignment with the notation
	 * stave it's formatted against. `record` captures each chord's lead -> TabNote for
	 * later hammer-on/pull-off resolution; the layout pass reuses this to size tab
	 * measures and passes none. `tuning` is the staff's open-string pitches, used to
	 * derive the string/fret of a note whose `<technical>` omits them (see tabPositions).
	 */
	vexflowTabTickables(
		chords: Chord[],
		tuning: number[] | null,
		// rule-ignore objects-over-callbacks: the notation path's `record` and this one are the
		// same collector, scoped to the one call for the same reason — see
		// VexflowVoiceTickablesOptions.record.
		record?: (lead: Note, tickable: StemmableNote) => void,
	): StemmableNote[] {
		const tickables: StemmableNote[] = [];
		let pendingGrace: { note: GraceTabNote; lead: Note }[] = [];
		for (const chord of chords) {
			if (chord.lead.isRest) {
				tickables.push(...ghostNotes(chord.lead.beats ?? 0));
				continue;
			}
			if (chord.lead.isGrace) {
				pendingGrace.push({
					note: vexflowTabGrace(chord, tuning),
					lead: chord.lead,
				});
				continue;
			}
			// A wholly tied-into (held) chord re-strikes no string, so guitar tab convention
			// omits every fret. Reserve its time with invisible ghosts (keeping the tab
			// aligned with the notation stave, which still draws the tied noteheads) rather
			// than printing the held frets.
			if (chord.notes.every(isTieStop)) {
				if (chord.lead.timeModification) {
					// A held note inside a tuplet: reserve it as ONE duration-coded ghost and
					// `record` it, so buildTuplets rescales this lone tickable with the tuplet —
					// a triplet that opens on a tied note (measure 25 of the jazz corpus) must
					// compress the frets after it or they drift right. ghostNotes can't stand in:
					// a tuplet-sized hole isn't dyadic, so it would drop a sub-128th remainder.
					const ghost = new GhostNote({
						duration: durationCode(chord.lead),
						dots: chord.lead.dots,
					});
					tickables.push(ghost);
					record?.(chord.lead, ghost);
				} else {
					// Outside a tuplet, keep the dyadic gap-fill: collapsing a compound duration
					// (e.g. a dotted held note) into one ghost would shift the softmax spacing of
					// neighboring notes (see grace_spacing).
					tickables.push(...ghostNotes(chord.lead.beats ?? 0));
				}
				continue;
			}
			const tabNote = this.vexflowTabChord(chord, tuning);
			if (pendingGrace.length > 0) {
				// No beamNotes() unlike the standard-notation path: tab grace notes have no
				// stem to anchor a beam, so beaming floats it off the staff — they render as
				// plain small fret numbers.
				const group = new GraceNoteGroup(pendingGrace.map((g) => g.note));
				// preFormat now so the width pad survives format()'s preFormatted guard.
				group.preFormat();
				group.setWidth(group.getWidth() + TAB_GRACE_SPACING);
				tabNote.addModifier(group, 0);
				// Record grace leads too so a slur from a grace note to its main note
				// resolves in buildHammerPulls (the GraceTabNote is a valid tie endpoint).
				for (const g of pendingGrace) {
					record?.(g.lead, g.note);
				}
				pendingGrace = [];
			}
			record?.(chord.lead, tabNote);
			tickables.push(tabNote);
		}
		return tickables;
	}

	/*
	 * A voice's tickables in onset order: each chord's StaveNote, with GhostNotes
	 * filling any gap before the first chord, between chords, or after the last chord
	 * up to `opts.endBeat`. A voice placed by <backup>/<forward> needn't start at beat 0,
	 * be contiguous, or run to the measure's end, so the chords' own measureBeats —
	 * not document order — decide where each note lands, keeping it aligned with the
	 * other voices on the stave. Without the trailing fill, a voice that stops early
	 * lets the formatter cram the other voices' later notes against its last note.
	 * See VexflowVoiceTickablesOptions for what the rest of the settings do.
	 */
	vexflowVoiceTickables(
		chords: Chord[],
		clef: string,
		opts: VexflowVoiceTickablesOptions = {},
	): VoiceTickable[] {
		const {
			endBeat = 0,
			record,
			octaveShiftOf = () => 0,
			defaultStem,
			barlines = [],
			midClefs = [],
			drawMidClefs = true,
		} = opts;
		const tickables: VoiceTickable[] = [];
		// Mid-measure clef changes, consumed the same way the dividers below are. `activeClef`
		// is what the notes after each one are positioned against.
		let activeClef = clef;
		let nextClef = 0;
		const flushClefs = (upTo: number) => {
			for (
				let change = midClefs[nextClef];
				change && change.beat <= upTo + EPSILON;
				change = midClefs[nextClef]
			) {
				activeClef = change.clef;
				if (drawMidClefs) {
					tickables.push(new ClefNote(change.clef, 'small', change.annotation));
				}
				nextClef++;
			}
		};
		// Mid-measure dividers, consumed in order as the cursor reaches each one's beat.
		let nextBarline = 0;
		const flushBarlines = (upTo: number) => {
			for (
				let bar = barlines[nextBarline];
				bar && bar.beat <= upTo + EPSILON;
				bar = barlines[nextBarline]
			) {
				tickables.push(midBarNote(bar.style));
				nextBarline++;
			}
		};
		// A lone whole rest fills the whole measure; center its glyph (full-measure-rest convention).
		const soleLead = chords.filter((c) => !c.lead.isGrace).map((c) => c.lead);
		const lone = soleLead.length === 1 ? soleLead[0] : undefined;
		const centerWholeRest = !!lone && lone.isRest && durationCode(lone) === 'w';
		let cursor = 0;
		// Grace notes steal no time, so they aren't tickables: they accumulate here and
		// attach to the next real note as a GraceNoteGroup modifier, drawn just left of it.
		let pendingGrace: { note: GraceNote; lead: Note }[] = [];
		// After-graces: a trailing cluster with no note left to lead decorates the note it
		// FOLLOWS instead, attaching to the previous tickable as a RIGHT-positioned group so it
		// draws past that notehead.
		const flushAfterGraces = (
			pendingAfter: { note: GraceNote; lead: Note }[],
		) => {
			const host = tickables.at(-1);
			if (!host || pendingAfter.length === 0) {
				return;
			}
			const group = new GraceNoteGroup(pendingAfter.map((g) => g.note));
			if (beamsGraceGroup(pendingAfter)) {
				group.beamNotes();
			}
			group.setPosition(Modifier.Position.RIGHT);
			group.preFormat();
			host.addModifier(group, 0);
			for (const g of pendingAfter) {
				record?.(g.lead, g.note);
			}
		};
		for (const chord of chords) {
			if (chord.lead.isGrace) {
				pendingGrace.push({
					note: this.vexflowChord(chord, activeClef, {
						octaveShift: octaveShiftOf(chord.lead),
					}) as GraceNote,
					lead: chord.lead,
				});
				continue;
			}
			const onset = chord.measureBeat ?? cursor;
			// Before any ghost padding, so a divider on an empty stretch sits at the moment it
			// falls on rather than being pushed to the next note's edge.
			flushBarlines(onset);
			flushClefs(onset);
			if (onset > cursor + EPSILON) {
				tickables.push(...ghostNotes(onset - cursor));
			}
			const staveNote = this.vexflowChord(chord, activeClef, {
				alignCenter: centerWholeRest,
				octaveShift: octaveShiftOf(chord.lead),
				defaultStem,
			});
			if (pendingGrace.length > 0) {
				const group = new GraceNoteGroup(pendingGrace.map((g) => g.note));
				// The main beam pass skips grace notes (they never enter `byLead`), so a grace
				// cluster beams itself.
				if (beamsGraceGroup(pendingGrace)) {
					group.beamNotes();
				}
				// preFormat now so the group's width is available to the layout pass (which reads
				// it to allocate the measure extra room) and stable for draw.
				group.preFormat();
				staveNote.addModifier(group, 0);
				// Give the grace cluster breathing room from the preceding note by padding that
				// note's RIGHT, which pushes the host (and its attached grace) right together so
				// the gap opens before the grace while it stays snug to its host. Inflating the
				// host's own left reservation instead would just let the grace drift left off it.
				// setRightDisplacedHeadPx survives format (only the constructor resets it), but
				// vexflow draws augmentation dots after that displaced-head gap — so skip a note
				// that carries dots, which would otherwise be flung out to the right.
				const prev = tickables.at(-1);
				const prevHasDots = prev
					?.getModifiers()
					.some((m) => m.getCategory() === 'Dot');
				if (prev && !prevHasDots) {
					prev.setRightDisplacedHeadPx(
						prev.getRightDisplacedHeadPx() + GRACE_SPACING,
					);
				}
				// Record grace leads too so a slur from a grace note to its main note
				// resolves in buildSlurs (the GraceNote is a valid Curve endpoint).
				for (const g of pendingGrace) {
					record?.(g.lead, g.note);
				}
				pendingGrace = [];
			}
			record?.(chord.lead, staveNote);
			tickables.push(staveNote);
			cursor = onset + (chord.lead.beats ?? 0);
		}
		// Graces still pending at the end have no note left to lead, so they're after-graces of
		// the last one. Flushed before the trailing ghosts so they anchor to a real note rather
		// than to padding.
		flushAfterGraces(pendingGrace);
		pendingGrace = [];
		flushBarlines(Number.POSITIVE_INFINITY);
		// A clef trailing the last note is the courtesy clef: it draws after that note and
		// before the trailing ghosts, so it sits inside the measure rather than past its fill.
		flushClefs(Number.POSITIVE_INFINITY);
		if (endBeat > cursor + EPSILON) {
			tickables.push(...ghostNotes(endBeat - cursor));
		}
		return tickables;
	}

	/*
	 * Wrap tickables in a SOFT-mode vexflow Voice at the score's softmax factor. The width-
	 * measuring pass (layout's measureNoteArea) and the draw pass (buildNotes/buildTabNotes)
	 * must build their voices identically, or the measured width and the drawn width disagree
	 * and notes shear; sharing this builder keeps the two passes in lockstep by construction.
	 */
	softVoice(tickables: VoiceTickable[], softmaxFactor: number): Voice {
		return new Voice()
			.setMode(Voice.Mode.SOFT)
			.setSoftmaxFactor(softmaxFactor)
			.addTickables(tickables);
	}
}

/*
 * Find a note's first attached modifier of a given vexflow category (a GraceNoteGroup,
 * Bend, Vibrato, …), or undefined. vexflow types getModifiers() loosely, so the find needs
 * a cast; centralizing it keeps that one unsafe cast in a single auditable place instead of
 * hand-copied at each call site — including across modules, since layout can't import draw
 * and its graceWidthOf would otherwise re-roll the same find.
 */
export function findModifier<T extends Modifier>(
	note: { getModifiers(): { getCategory(): string }[] },
	category: string,
): T | undefined {
	return note.getModifiers().find((m) => m.getCategory() === category) as
		| T
		| undefined;
}
