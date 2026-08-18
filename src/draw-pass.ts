import {
	type BeamRun,
	type Chord,
	groupBeamRuns,
	type Harmony,
	type Key,
	type Measure,
	type Note,
	type Part,
	type Score,
	type Time,
} from '@stringsync/mdom';
import {
	Barline,
	BarNote,
	Bend,
	ClefNote,
	Element,
	Font,
	Formatter,
	GhostNote,
	GraceNoteGroup,
	KeySignature,
	Metrics,
	MetricsDefaults,
	Modifier,
	MultiMeasureRest,
	type PedalMarking,
	type RenderContext,
	Stave,
	StaveConnector,
	type StaveModifier,
	StaveModifierPosition,
	StaveNote,
	StaveTempo,
	Stem,
	type StemmableNote,
	TabNote,
	TabStave,
	TextBracket,
	TimeSignature,
	Vibrato,
	type Voice,
	Volta,
} from 'vexflow';
import { ChordDiagramGlyph, type ChordFrame } from './chord-diagram-glyph';
import { type CollisionKind, CollisionResolver } from './collision-resolver';
import type { Config, Gap, MeasureNumbering } from './config';
import {
	BRACE_LEFT_OVERHANG,
	BRACKET_GLYPH_OVERHANG,
	BRACKET_X_SHIFT,
	CHORD_DIAGRAM_GAP,
	CHORD_DIAGRAM_HEIGHT,
	CHORD_DIAGRAM_PADDING,
	CHORD_DIAGRAM_WIDTH,
	CONNECTOR_VERTICAL_OVERHANG,
	DIRECTION_LINE_HOOK,
	DIRECTION_LINE_TEXT_LINE,
	DYNAMICS_FONT_SIZE,
	FRET_HALF_H,
	FRET_HALF_W,
	GAP_LABEL_FONT_SIZE,
	GRACE_GROUP_SPACING_STAVE,
	HARMONY_ACCIDENTAL_FONT_SIZE,
	HARMONY_ACCIDENTAL_KERN,
	HARMONY_ACCIDENTALS,
	HARMONY_FONT_SIZE,
	HARMONY_NOTE_CLEARANCE,
	HARMONY_PADDING,
	HARMONY_Y_OFFSET,
	LABEL_FONT_SIZE,
	LABEL_GAP,
	LYRIC_FONT_SIZE,
	LYRIC_LINE_HEIGHT,
	LYRIC_NOTE_CLEARANCE,
	LYRIC_Y_OFFSET,
	MULTI_REST_PADDING,
	NAVIGATION_FONT_SIZE,
	NOTEHEAD_HALF_H,
	OTTAVA_TEXT_LINE,
	PAGE_MARGIN_X,
	PART_GROUP_STEP,
	PEDAL_BOTTOM_MARGIN,
	PEDAL_BOTTOM_TEXT_LINE,
	PEDAL_INK_RISE,
	REHEARSAL_FONT_SIZE,
	REHEARSAL_NOTE_CLEARANCE,
	REHEARSAL_PADDING,
	REHEARSAL_Y_OFFSET,
	SPILL_COLUMN,
	TAB_CURVE_RISE,
	TECHNICAL_EDGE_GAP,
	TEMPO_MARK_GAP,
	TEMPO_NOTE_CLEARANCE,
	TEMPO_SCALE,
	TIE_APEX_RISE,
	VOLTA_LABEL_DROP,
	VOLTA_NOTE_CLEARANCE,
	VOLTA_STAVE_GAP,
	WORDS_FONT_SIZE,
	WORDS_NOTE_CLEARANCE,
	WORDS_Y_OFFSET,
} from './constants';
import { gapsByMeasureIndex } from './gaps';
import { Rect } from './geometry';
import type { MeasureBox, ScoreLayout } from './layout-planner';
import { MetronomeGlyph, type TempoModulation } from './metronome-glyph';
import {
	ACCIDENTAL_CODES,
	applyNoteColors,
	BAR_STYLE_TYPES,
	findModifier,
	LyricAnnotation,
	type MidClefSpec,
	type NoteTranslator,
	TechnicalAnnotation,
} from './note-translator';
import { type MeasureEnding, measureRepeats } from './repeats';
import type { RawChordDiagram, RawMeasure, RawNote } from './score-drawer';
import type {
	DirectionLineSpan,
	LineEnd,
	OctaveShiftSpan,
	PedalMark,
	Placement,
	ScoreReader,
	StaffVoice,
	TempoMark,
	WedgeMark,
} from './score-reader';
import { dynamicGlyphs } from './score-reader';

/**
 * One measure's metronome mark(s): the rate from a `<beat-unit>` metronome, the note-group
 * relation from a `<metronome-note>` one, or both. At least one is non-null.
 */
type TempoTask = {
	tempo: TempoMark | null;
	modulation: TempoModulation | null;
};

import type { Hairpin, SpannerBuilder } from './spanner-builder';
import {
	barlineBreaks,
	isTabStaff,
	type PartGroup,
	pairsTabWithNotation,
	partGroups,
	partSymbol,
	stringTuning,
	visibleStaffNumbers,
} from './staves';

/*
 * MusicXML <time> -> vexflow time-signature spec: 'C' (common), 'C|' (cut), or
 * "beats/beat-type". null when there's nothing drawable. Doubles as the equality
 * key for detecting a mid-piece meter change.
 */
// VexFlow keys the tonic note for major but wants an 'm' suffix for minor
// ('Am', 'G#m'); the bare minor tonic ('G#') is rejected as a bad key spec.
function vexflowKeySpec(key: Key): string {
	return key.mode === 'minor' ? `${key.rootNote}m` : `${key.rootNote}`;
}

/*
 * A key signature spelled out accidental by accidental, for a <key> written with
 * <key-step>/<key-alter> instead of <fifths> — microtonal and modal-jazz signatures, which
 * are not circle-of-fifths shaped and so have no key spec to name them.
 *
 * vexflow's own KeySignature always rebuilds its accidentals from a key spec (format() calls
 * Tables.keySignature), so there is no way to hand it a list; this overrides that one step
 * and reuses everything else — the glyph laying, the spacing and the stave-modifier plumbing
 * — so a custom signature places, measures and draws exactly like a normal one.
 */
class CustomKeySignature extends KeySignature {
	constructor(
		private readonly accidentals: ReadonlyArray<{ type: string; line: number }>,
	) {
		// Any valid spec: format() below never reads it.
		super('C');
	}

	override format(): void {
		let stave = this.getStave();
		if (!stave) {
			stave = new Stave(0, 0, 100);
			this.setStave(stave);
		}
		this.width = 0;
		this.children = [];
		// Copied, not shared: convertToGlyph reads acc.line and the parent's cancel/alter paths
		// mutate the entries in place.
		this.accList = this.accidentals.map((a) => ({ ...a }));
		for (const [i, acc] of this.accList.entries()) {
			// nextAcc only widens the gap around a natural; the parent passes an
			// out-of-range read for the last one the same way.
			this.convertToGlyph(
				acc,
				this.accList[i + 1] as { type: string; line: number },
				stave,
			);
		}
		this.calculateDimensions();
		this.formatted = true;
	}
}

// MusicXML <key-alter> semitones -> the vexflow accidental code, for a signature written
// without <fifths>. A <key-accidental> naming the glyph outright wins over this (see
// customKeyAccidentals); this is the fallback every exporter can be counted on to imply.
const KEY_ALTER_CODES: Record<string, string> = {
	'-2': 'bb',
	'-1': 'b',
	'0': 'n',
	'1': '#',
	'2': '##',
};

/*
 * The staff line a key-signature accidental on `step` sits at, in the coordinates
 * KeySignature draws in (0 = top line, +1 per line downward). `octave` pins it outright —
 * MusicXML's <key-octave>. Without one, the accidental takes the highest position that still
 * lands on the stave, which is where the traditional signatures put every flat and most
 * sharps, so an unpinned custom signature reads like an ordinary one.
 *
 * The position comes from a throwaway StaveNote rather than a hand-rolled clef table: vexflow
 * already resolves step/octave against every clef it knows. Its key props count lines
 * bottom-up from below the stave, which is why the flip is `5 -` and not `4 -`: a note drawn
 * at key-prop line L lands on Stave.getYForNote(L), and that is getYForLine(5 - L).
 * ponytail: the flip assumes a 5-line stave. A non-traditional signature on a reduced stave
 * would sit as if the missing lines were there; no fixture has one.
 */
function keySignatureLine(
	step: string,
	octave: number | null,
	clef: string,
): number {
	const lineOf = (o: number) =>
		5 -
		(new StaveNote({
			keys: [`${step.toLowerCase()}/${o}`],
			duration: 'w',
			clef,
		}).getKeyProps()[0]?.line ?? 2);
	if (octave !== null) {
		return lineOf(octave);
	}
	const onStave = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
		.map(lineOf)
		.filter((line) => line >= 0 && line <= 4);
	// Highest on the stave = the smallest line number. Every step has one in every clef, so
	// the middle-line fallback is unreachable in practice.
	return onStave.length > 0 ? Math.min(...onStave) : 2;
}

/*
 * A <key>'s non-traditional accidentals — the <key-step>/<key-alter>(/<key-accidental>)
 * triples MusicXML writes instead of <fifths> — as the glyph list a CustomKeySignature draws,
 * in the order given rather than in circle-of-fifths order. Empty when the key is an ordinary
 * <fifths> one (or carries nothing at all), which is the signal to use the plain key spec.
 */
function customKeyAccidentals(
	key: Key,
	clef: string,
): Array<{ type: string; line: number }> {
	const out: Array<{ type: string; line: number }> = [];
	for (const alteration of key.alterations) {
		const named = alteration.accidental;
		const type =
			(named ? ACCIDENTAL_CODES[named] : undefined) ??
			KEY_ALTER_CODES[String(alteration.alter)];
		if (!type) {
			continue;
		}
		out.push({
			type,
			line: keySignatureLine(alteration.step, alteration.octave, clef),
		});
	}
	return out;
}

function timeSignatureSpec(time: Time | null): string | null {
	if (time?.symbol === 'common') {
		return 'C';
	}
	if (time?.symbol === 'cut') {
		return 'C|';
	}
	// symbol="single-number" prints the beat count alone. vexflow reads a spec with no '/'
	// as a lone numerator and centers it vertically between the two signature lines.
	if (time?.symbol === 'single-number' && time.beats) {
		return time.beats;
	}
	if (time?.beats && time?.beatType) {
		return `${time.beats}/${time.beatType}`;
	}
	return null;
}

/*
 * True when a notation+tab pair is split across separate single-stave parts (a
 * guitar's notation in one part, its TAB in another) rather than stacked in one
 * two-stave part. Such a system is bracketed by convention, the cross-part analog
 * of pairsTabWithNotation. Only meaningful for multi-part systems — a single
 * notation+tab part already brackets itself via partSymbol.
 */
function partsPairTabWithNotation(
	parts: Part[],
	showTabs: boolean,
	showNotation: boolean,
): boolean {
	// A notation+tab pairing needs both kinds on screen; hide either and it can't pair.
	if (!showTabs || !showNotation || parts.length < 2) {
		return false;
	}
	// A part that stacks both kinds ITSELF is not a cross-part pairing — it already brackets
	// its own two staves via partSymbol. Without this, a score that merely CONTAINS such a
	// part (a singer over a notation+TAB guitar) also brackets the whole system, sweeping the
	// unrelated part into the guitar's bracket.
	if (
		parts.some((part) => pairsTabWithNotation(part, { showTabs, showNotation }))
	) {
		return false;
	}
	// ponytail: the bracket still spans the whole system, which is right for the two-part
	// case this exists for. Track the pair's part indexes if a score ever puts an ungrouped
	// third part alongside a split notation/TAB pair.
	const kinds: boolean[] = [];
	for (const part of parts) {
		for (let staff = 1; staff <= Math.max(part.staveCount, 1); staff++) {
			kinds.push(isTabStaff(part, String(staff)));
		}
	}
	return kinds.includes(true) && kinds.includes(false);
}

// One stave's notes, built but not yet formatted or drawn. A part's staves are
// formatted together (see formatAndDrawSystem) so notes at the same tick line up
// vertically across staves, so the build (voice/spanner construction) is split from
// the format+draw step.
/**
 * How far one stave row's drawn content spilled past its staff lines, plus where those
 * lines sit relative to the stave's y (what a stave offset positions). Measured on a
 * first draw pass so a second can re-space the staves around the actual music instead of
 * a fixed gap — the vertical analog of the per-system topOverflow feedback.
 */
export type StaveSpill = {
	/** Px the content rose above the top staff line, per x column (see SPILL_COLUMN):
	 * `Math.floor(x / SPILL_COLUMN)` -> the worst rise anything covering that column had.
	 * A column nothing reached over is absent rather than 0. */
	rise: Map<number, number>;
	/** Px the content dropped below the bottom staff line, columned the same way. */
	drop: Map<number, number>;
	/** Top staff line, relative to the stave's y. */
	lineTop: number;
	/** Bottom staff line, relative to the stave's y. */
	lineBottom: number;
};

/*
 * Record `extent` px of spill against every x column `rect` covers, keeping the worst per
 * column. Nothing is stored for a non-positive extent — content that stays inside its own
 * staff lines has nothing for a neighbour to clear, and an absent column reads as 0.
 */
export function bandSpill(
	columns: Map<number, number>,
	rect: Rect,
	extent: number,
): void {
	const first = Math.floor(rect.x / SPILL_COLUMN);
	const last = Math.floor(rect.right / SPILL_COLUMN);
	if (extent <= 0 || !Number.isFinite(first) || !Number.isFinite(last)) {
		return;
	}
	for (let column = first; column <= last; column++) {
		columns.set(column, Math.max(columns.get(column) ?? 0, extent));
	}
}

type PendingStave = {
	stave: Stave;
	// Which global stave row this is, so the pass can attribute the content drawn on it
	// to that row and report how far it spilled (see observedStaveSpill).
	row: number;
	isTab: boolean;
	vexVoices: Voice[];
	beams: ReturnType<SpannerBuilder['buildBeams']>;
	// Beam groups read off this stave's voices, waiting on the rest of the part's staves
	// before they can be built — a cross-staff run names notes another stave drew. Consumed
	// (and emptied into `beams`) by buildPartBeams.
	beamPlans: Array<{
		groups: BeamRun[];
		defaultStem?: 'up' | 'down';
	}>;
	tuplets: ReturnType<SpannerBuilder['buildTuplets']>;
	// Each voice's chords, waiting alongside beamPlans: a tuplet hides its bracket when its
	// notes are already beamed, so it has to be built AFTER the beams are.
	tupletChords: Chord[][];
	// Real notes only (no gap-filling ghosts), for the bottom-bound calc.
	staveNotes: StaveNote[];
	// StaveNotes whose lead carries a tie — they get a tie-apex collision obstacle once their
	// stem direction is final (stem-down ties bow up over the noteheads). See tieApexRect.
	tiedNotes: Set<StaveNote>;
	// Each real (non-grace) note paired with its mdom chord, so the hit index can map every
	// notehead/fret back to its note after formatting. One of these is populated per stave kind.
	noteChords: Array<{ note: StaveNote; chord: Chord }>;
	tabChords: Array<{ note: TabNote; chord: Chord }>;
	// Grace noteheads, paired like noteChords. Captured into the hit index so playback can sound
	// and light them, but kept out of the pointer tree (hit.ts) so they don't steal clicks.
	graceChords: Array<{ note: StaveNote; chord: Chord }>;
	// The tab analog of graceChords: grace fret glyphs, so a tab grace colors with its notation one.
	graceTabChords: Array<{ note: TabNote; chord: Chord }>;
	// Mid-measure dividers whose <bar-style> vexflow can't draw: the invisible BarNote holding
	// the divider's place, painted at its formatted x once the voice is drawn.
	midBars: Array<{ note: BarNote; style: string }>;
};

// Above-stave text (chord symbols, words) clears notes, ties, and other placed text, but NOT
// chord diagrams — a diagram deliberately draws on top of any text it shares a spot with. All
// nudge logic funnels through the CollisionResolver; see docs/collision-audit.md.
const TEXT_CLEAR_KINDS: CollisionKind[] = ['note', 'tie', 'annotation'];

// A dynamic that sets a sustained LEVEL rather than accenting one note: any run of p's or
// f's, plus mp/mf. These stay in force until the next one, so an immediate restatement of
// the level already sounding is redundant and doesn't print. Everything else (sfz, fp, rfz,
// fz, an <other-dynamics>) marks a single note and always prints, however often it repeats.
const SUSTAINED_DYNAMIC = /^(p+|f+|mp|mf)$/;

// How far a restatement of the sounding level can be from the last one printed and still
// count as redundant, in measures. GuitarPro exports the level on EVERY measure, which this
// swallows; a composer restating a dynamic further along — Schumann re-marking `p` at a new
// stanza after the voice has rested — is a fresh reminder to the player and prints.
const DYNAMIC_RESTATE_GAP = 1;

// The SMuFL glyphs of the two navigation signs. They engrave as music, not as text — a
// segno is a symbol a player recognizes by shape, so spelling it "Segno" would not do.
const NAVIGATION_GLYPHS: Record<'segno' | 'coda', string> = {
	segno: '\uE047', // segno
	coda: '\uE048', // coda
};

// The face drawWords types a beside-stave string in. A words directive gets the text font
// in italics; a dynamics marking gets the notation font (SMuFL glyphs are not text) at its
// own larger size, so it engraves as music.
type SideTextStyle = {
	font: string;
	size: number;
	italic: boolean;
	color?: string;
	/** Where the string sits relative to its anchor x. Default 'left' — a directive is a
	 * phrase reading rightward from its note; a dynamic centers on its notehead, and a
	 * repeat-times label ends at the barline it labels. */
	align?: 'left' | 'center' | 'right';
};

// What a measure's <barline>s ask the renderer to draw at its edges: repeat dots (as a vexflow
// Barline type) and the volta bracket over it (as a vexflow Volta type + its printed label).
type BarlineDecoration = {
	repeatBegin: boolean;
	repeatEnd: boolean;
	/** The printed "Nx" label of a repeat played more than twice, or null. A plain backward
	 * repeat means two passes and is drawn by its dots alone. */
	repeatTimesLabel: string | null;
	volta: { type: number; label: string } | null;
};

/*
 * Every measure's barline decorations, mapped from the shared repeat structure (src/repeats.ts,
 * which playback reads too). An ending run's bracket opens with a left hook (BEGIN), continues
 * hookless (MID), and closes with a right hook (END) — BEGIN_END when the run is one measure.
 * A `discontinue` close leaves the bracket open on the right, so it keeps the hookless form.
 */
function barlineDecorations(measures: readonly Measure[]): BarlineDecoration[] {
	return measureRepeats(measures).map(
		({ repeatBegin, repeatEnd, repeatTimes, ending }) => ({
			repeatBegin,
			repeatEnd,
			// <repeat times> counts the total passes, and two is what a repeat sign already
			// says, so only three or more is worth printing.
			repeatTimesLabel:
				repeatEnd && repeatTimes && repeatTimes > 2 ? `${repeatTimes}x` : null,
			volta: ending && {
				type: voltaType(ending),
				label: voltaLabel(ending.number),
			},
		}),
	);
}

function voltaType(ending: MeasureEnding): number {
	const hooked = ending.last && !ending.open;
	if (ending.first) {
		return hooked ? Volta.type.BEGIN_END : Volta.type.BEGIN;
	}
	return hooked ? Volta.type.END : Volta.type.MID;
}

const NO_DECORATION: BarlineDecoration = {
	repeatBegin: false,
	repeatEnd: false,
	repeatTimesLabel: null,
	volta: null,
};

/*
 * The stroke pattern of each <bar-style> vexflow has no type for, as [offset, width] pairs
 * measured from the barline's x — the same geometry vexflow's own Barline uses, where a thin
 * bar is 1px at x and a thick one is 3px at x-2, so a custom style sits flush with the plain
 * dividers around it. `dash` turns the stroke into a broken line ([on, off] lengths).
 *
 * 'tick' and 'short' are the abbreviated dividers: both are single thin strokes that cover
 * only part of the stave height, so they carry a `span` in staff-space units measured down
 * from the top line — a tick straddles the top line, a short one fills the middle two spaces.
 */
const CUSTOM_BAR_STYLES: Record<
	string,
	{
		bars: Array<[offset: number, width: number]>;
		dash?: [number, number];
		span?: [from: number, to: number];
	}
> = {
	dotted: { bars: [[0, 1]], dash: [1, 3] },
	dashed: { bars: [[0, 1]], dash: [4, 4] },
	heavy: { bars: [[-2, 3]] },
	'heavy-light': {
		bars: [
			[-5, 3],
			[0, 1],
		],
	},
	'heavy-heavy': {
		bars: [
			[-6, 3],
			[-2, 3],
		],
	},
	tick: { bars: [[0, 1]], span: [-0.5, 0.5] },
	short: { bars: [[0, 1]], span: [1, 3] },
};

/* "1" -> "1.", "1,2" -> "1., 2." — the printed form of an `<ending>`'s number list. */
function voltaLabel(number: string): string {
	return number
		.split(',')
		.map((part) => `${part.trim()}.`)
		.join(' ');
}

/* Push every modifier in `group` out to the rightmost x any of them reached. */
function squareUp(group: StaveModifier[]): number | null {
	if (group.length < 2) {
		return group[0]?.getX() ?? null;
	}
	const x = Math.max(...group.map((modifier) => modifier.getX()));
	for (const modifier of group) {
		modifier.setX(x);
	}
	return x;
}

/*
 * Square up the opening repeat sign and the time signature across a measure's staves, and
 * return the repeat's x (null when the measure opens with none).
 *
 * Both belong to the MEASURE rather than to one stave, so they should read as one vertical
 * column — but vexflow lays each stave's begin modifiers out on its own, so they shear apart
 * whenever the glyphs ahead of them differ in width: a treble clef plus a time signature is
 * wider than a bare "TAB" glyph, and a grand staff can carry a different key per stave
 * (staves_different_keys), or a key on one stave and none on another (transpose). The widest
 * stave wins and the rest are pushed out to match.
 *
 * The clef and key are deliberately NOT squared up, which is where this parts company with
 * vexflow's own Stave.formatBegModifiers: a key signature is engraved flush after its own
 * clef, so those already sit where they belong, and equalizing them would pad every
 * multi-stave system's opening for nothing. The note start is unified separately, in
 * formatAndDrawSystem.
 *
 * One pass for both, because Stave.format() reassigns every modifier's x — running two
 * alignments in sequence would have the second one's format() undo the first.
 */
function alignBegModifiers(staves: readonly Stave[]): number | null {
	const repeats: StaveModifier[] = [];
	const timeSignatures: StaveModifier[] = [];
	for (const stave of staves) {
		stave.format(); // modifier x isn't assigned until the stave lays itself out
		for (const modifier of stave.getModifiers(StaveModifierPosition.BEGIN)) {
			if (
				modifier instanceof Barline &&
				modifier.getType() === Barline.type.REPEAT_BEGIN
			) {
				repeats.push(modifier);
			} else if (modifier.getCategory() === TimeSignature.CATEGORY) {
				timeSignatures.push(modifier);
			}
		}
	}
	squareUp(timeSignatures);
	return repeats.length > 0 ? squareUp(repeats) : null;
}

/*
 * The GraceNoteGroup attached to a note (the small notes drawn just left of it), if any.
 */
function graceGroupOf(note: {
	getModifiers(): { getCategory(): string }[];
}): GraceNoteGroup | undefined {
	return findModifier<GraceNoteGroup>(note, GraceNoteGroup.CATEGORY);
}

/*
 * Whether measure at 0-based `index` (system-start or not) shows its number under
 * the given mode. 'every-N' numbers every Nth measure plus every system start.
 */
function showsMeasureNumber(
	mode: MeasureNumbering,
	index: number,
	isSystemStart: boolean,
): boolean {
	switch (mode) {
		case 'none':
			return false;
		case 'system':
			return isSystemStart;
		case 'every':
			return true;
		case 'every-2':
			return isSystemStart || index % 2 === 0;
		case 'every-3':
			return isSystemStart || index % 3 === 0;
	}
}

/* What a redraw carries over from the pass before it. Both are empty on a first pass, which
 * is what measures them. */
export interface DrawPassOptions {
	/* Per lyric row, how far to drop it so it clears the lyrics of the system above. */
	lyricDrops?: Map<string, number>;
	/* Per system, how far to lift its volta bracket so it clears the notes under it. */
	voltaLifts?: Map<number, number>;
}

/*
 * Draw every measure once. `topOverflow` maps a systemIndex to extra space to reserve
 * above that system so its notes (which rise above its own top stave) clear the system
 * before it — measured on a first pass and applied on a second (see the driver in
 * ScoreDrawer.draw). run() returns the page extents drawn plus the overflow this pass
 * observed per system. One instance draws one pass — a redraw constructs a fresh
 * DrawPass, so every field below starts clean.
 */
export class DrawPass {
	private readonly measureCount: number;
	private readonly boxes: MeasureBox[];
	private readonly staveOffsets: number[];
	private readonly systemStaveOffsets:
		| ReadonlyMap<number, number[]>
		| undefined;
	private readonly totalStaves: number;
	private readonly softmaxFactor: number;
	private readonly systemGap: number;
	private readonly labelIndent: number;
	private readonly partLabelIndent: number;
	private readonly measureNumbering: MeasureNumbering;
	private readonly showTabSlideText: boolean;
	// When false, tab staves are dropped — iterate visibleStaffNumbers, not staveCount.
	private readonly showTabs: boolean;
	// When false, notation staves are dropped the same way tab staves are.
	private readonly showNotation: boolean;
	// Document measure index -> the gap spec rendered there (empty when config has none).
	/* score.parts rebuilds its array on every read, so hold it once. */
	/* score.parts rebuilds its array on every read, so hold it once. */
	private readonly parts: Part[];
	private readonly gaps: ReadonlyMap<number, Gap>;
	// Lead measure index -> the number of measures its <multiple-rest> consolidates.
	private readonly multiRests: ReadonlyMap<number, number>;
	// The multirest bars to draw over this column's staves, once those staves are on the canvas.
	private columnMultiRests: Array<{ stave: Stave; count: number }> = [];
	// Ink colors from config.fonts. notationColor is the context's default fill/stroke, so every
	// vexflow-engraved glyph (noteheads, stems, staves, clefs) inherits it; textColor recolors the
	// words vexml types itself. Both default to black, keeping an uncolored score byte-identical.
	private readonly notationColor: string;
	private readonly textColor: string;

	// One note map for the whole score: ties and slurs can span a barline, so their
	// two endpoints may live in different measures. Notes are drawn measure by
	// measure (recording into this map); the spanners are resolved once at the end.
	private readonly byLead = new Map<Note, StaveNote>();
	// Notes whose beam group spans two staves (see buildPartBeams). Their stems cross the
	// gap between the staves on purpose, so the stem tip is excluded from the stave spill
	// that sizes that gap — counting it would have the gap widen to "make room" for a stem
	// whose whole job is to reach the other stave, pushing the staves apart by the stem's
	// own length. The noteheads still count: a note written far outside its stave (M1's B4
	// on the bass staff) genuinely needs the clearance.
	private readonly crossStaveNotes = new Set<StaveNote>();
	private readonly allChords: Chord[] = [];
	// Pedal directions are spanners too (a start..stop pair), collected per measure
	// and resolved over the whole score alongside ties and slurs.
	private readonly allPedals: PedalMark[] = [];
	// Wedge (hairpin) markers, resolved into StaveHairpins over the whole score alongside
	// the pedals — a hairpin can span barlines, so it can't be built per measure.
	private readonly allWedges: WedgeMark[] = [];

	// The same arrangement for tablature staves: hammer-ons/pull-offs also span
	// barlines, so TAB notes record into their own map and resolve at the end.
	private readonly byTabLead = new Map<Note, TabNote>();
	private readonly allTabChords: Chord[] = [];

	// Systems stack top-to-bottom. Each is placed below the previous system's lowest
	// drawn content (notes + staff lines), so deep ledger lines push the next system
	// down instead of colliding with it — fixed spacing can't, since note range is
	// unbounded. The symmetric hazard — the next system's notes rising above its own
	// top stave into that gap — is covered by topOverflow, measured on a prior pass.
	private pageBottom = 0;
	private pageTop = Infinity;
	// Hit-index geometry collected this pass, in scratch space; the caller shifts it into
	// final score space once cropTop is known. Only the final pass's arrays are kept.
	private readonly rawNotes: RawNote[] = [];
	private readonly rawMeasures: RawMeasure[] = [];
	private readonly rawChordDiagrams: RawChordDiagram[] = [];
	private systemTopY: number;
	private systemContentBottom: number;
	private currentSystem = -1;
	// Per-system collision index of everything already drawn (notes, high ties, placed
	// chord symbols/words/diagrams). The above-stave annotations query it to nudge clear of
	// obstacles, and chord diagrams use it to space apart across a barline (replacing an old
	// running-cursor). Reset at each system start (x/y restart) — see the system-change
	// block. ALL nudge logic funnels through here; see docs/collision-audit.md.
	private readonly collisionResolver: CollisionResolver;
	// The drawable region of the scratch canvas. Anything escaping it is in "no-man's land"
	// and gets clipped, so warn — the slack that prevents this (LEDGER_HEADROOM/topSlack)
	// is then the knob to grow. Vertical edges only; horizontal page overflow is separate.
	private readonly scratchViewport: Rect;
	// Per system: the stave-top y it was placed at, and the highest (smallest) y any of
	// its content reached. Their difference is how far the system overflows above its
	// top stave — reserved above it on a redraw so it can't clash with the system above.
	private readonly systemTopByIndex = new Map<number, number>();
	private readonly systemHighestTop = new Map<number, number>();
	// The topmost y reached by above-stave text decorations (chord symbols, words) in a system.
	// Measure boxes grow up to this so the playback cursor/scroll cover those extras instead of
	// clipping them; tracked per system so the cursor bar's height stays uniform. Chord diagrams
	// are deliberately excluded — see the harmony draw block for why the cursor stops at the stave.
	private readonly systemDecorationTop = new Map<number, number>();
	// Every measure's repeat/volta barline decorations, resolved once for the whole document
	// (a volta's inner measures are only knowable from the measures around them).
	private readonly decorations: BarlineDecoration[];

	// Per-measure-column state: the measure loop's locals, shared by the methods cut
	// out of it below. Reset at the top of drawMeasureColumn (per-part fields in its
	// part loop) exactly where the original loop declared them.
	private measureX = 0;
	private measureWidth = 0;
	// Width at the right end of this measure the notes must NOT format into, so a words
	// directive on the last note has room to print before the barline (see MeasureBox).
	private measureTrailingPad = 0;
	// The same at the LEFT end, so a centered words directive on the first note prints clear
	// of the opening barline instead of across it (see MeasureBox).
	private measureLeadingPad = 0;
	private systemIndex = 0;
	private isSystemStart = false;
	private isLastMeasure = false;
	// This measure's right <bar-style>, or null when it declares none. See BAR_STYLE_TYPES
	// for which values vexflow draws itself and drawCustomBarline for the rest.
	private barStyle: string | null = null;
	// This measure's repeat dots and volta bracket, plus the neighbors' repeat state — a
	// backward repeat butted against the next measure's forward repeat prints as one
	// back-to-back sign rather than two, so each edge needs to see the other side.
	private decoration: BarlineDecoration = NO_DECORATION;
	private repeatBoth = false;
	private suppressBegRepeat = false;
	private showMeasureNumber = false;
	// Number is printed once per measure, above the system's top stave only.
	private measureNumbered = false;
	private systemY = 0;
	private staveRow = 0;
	// Per stave row, how far the content drawn on it spilled past its own staff lines.
	// Maxed across every measure and system, so one global set of stave offsets (which
	// every system shares) can be sized from them. See ScoreDrawer.spacedOffsets.
	private readonly staveSpill = new Map<number, Map<number, StaveSpill>>();
	// Which row every stave built this pass sits on. `rowOf` only sees the system being
	// built; the spanners are drawn at the end of the pass, over staves from every system.
	private readonly rowByStave = new Map<Stave, number>();
	// Likewise the system each stave belongs to, so a spanner drawn at the end of the pass can
	// reserve room against the system above it (see observedOverflow).
	private readonly systemByStave = new Map<Stave, number>();
	private systemTop: Stave | undefined;
	private systemBottom: Stave | undefined;
	// Every part's staves are formatted together as one column so notes at the same
	// tick line up vertically across the whole system — not just within a part.
	// Standard engraving aligns all instruments on the beat, and a notation+tab pair
	// split into separate MusicXML parts must align the same as a single two-stave
	// part. Built per part below, then formatted and drawn once after the part loop.
	private systemPending: PendingStave[] = [];
	// Verse baseline feedback, keyed by `<systemIndex>:<staveRow>`: how far below the bottom
	// staff line this pass hung the row's lyrics, and whether the row's measure columns
	// disagreed (see recordLyricDrop).
	private observedLyricDrops = new Map<string, number>();
	private lyricsStepped = false;

	// How far this system's volta brackets have to rise off their default gap to clear the
	// notes under them, measured this pass and applied on the next (see voltaLifts).
	private observedVoltaLifts = new Map<number, number>();
	// This column's unlifted volta line y, or null when the column carries no bracket — set
	// while the staves are built, read once the notes have been formatted.
	private columnVoltaBase: number | null = null;
	// Every stave of the measure column being built, drawn once the whole column exists so a
	// repeat sign can be lined up across staves that reserve different opening widths.
	private columnStaves: Stave[] = [];
	// Where this column's opening repeat sign ended up once aligned, so the connector that
	// carries it across the staves can be placed there too. Null when there is no such sign.
	private begRepeatX: number | null = null;
	private tempoTasks: Array<{ stave: Stave } & TempoTask> = [];
	// Chord symbols, drawn after the system is formatted so each sits at its
	// note's laid-out x.
	private harmonyTasks: Array<{
		// A notation note when the part has a notation stave, else the tab note — a
		// tab-only part still prints its chord symbols.
		staveNote: StaveNote | TabNote;
		text: string;
		frame: ChordFrame | null;
		source: Harmony;
	}> = [];
	// Words directions (e.g. "ritardando"), each drawn on its stave's `placement` side at
	// the laid-out x of the note it applies to.
	private wordsTasks: Array<{
		stave: Stave;
		text: string;
		anchor: StaveNote | TabNote | undefined;
		placement: Placement;
	}> = [];
	// Dynamics markings (p, mf, sfz, …), queued like wordsTasks but drawn in the notation
	// font when `glyph` says the marking spells out of SMuFL's dynamic letters.
	private dynamicsTasks: Array<{
		stave: Stave;
		text: string;
		glyph: boolean;
		anchor: StaveNote | TabNote | undefined;
		placement: Placement;
	}> = [];
	// The sustained dynamic level currently sounding on each `<partIndex>:<staffNumber>`, and
	// the measure it was last STATED in (printed or suppressed), so a restatement of it can
	// be dropped. Runs across the whole score: the measure loop visits measures once, in order.
	private soundingDynamic = new Map<
		string,
		{ text: string; measure: number }
	>();
	// <figured-bass> stacks, queued like the other note-anchored annotations. `figures` is the
	// whole stack, top row first; it draws as one row per figure under the stave.
	private figuredBassTasks: Array<{
		stave: Stave;
		figures: string[];
		anchor: StaveNote | TabNote | undefined;
	}> = [];
	// A part's staves are built here, then formatted and drawn together below so
	// notes at the same tick align vertically across staves (notation over tab).
	private pendingStaves: PendingStave[] = [];
	// This measure column's top/bottom stave per part index, so a <part-group> connector
	// can span from one part's top stave to another's bottom. Sparse: a part with no
	// measure here has no entry.
	private partStaves: Array<{ top: Stave; bottom: Stave } | undefined> = [];
	// The <part-group> spans from the <part-list>, outermost first. Fixed for the score.
	private readonly partGroups: PartGroup[];
	// Part boundaries a barline must not run across (<group-barline>no</group-barline>).
	// Empty for every score that doesn't ask, which is nearly all of them.
	private readonly barlineBreaks: Set<number>;
	// The score's <octave-shift> spans, and the per-note octave offset they imply. Fixed for
	// the score; both are filled in the constructor.
	private readonly octaveShiftSpans: OctaveShiftSpan[] = [];
	private readonly octaveShiftByNote = new Map<Note, number>();
	// The score's <bracket>/<dashes> spans, drawn once at the end alongside the other spanners.
	private readonly directionLineSpans: DirectionLineSpan[] = [];
	// Measured on the previous pass and reserved on this one; empty on the first pass.
	private readonly lyricDrops: Map<string, number>;
	private readonly voltaLifts: Map<number, number>;

	constructor(
		private readonly translator: NoteTranslator,
		private readonly reader: ScoreReader,
		private readonly spanners: SpannerBuilder,
		config: Config,
		private readonly context: RenderContext,
		private readonly score: Score,
		layout: ScoreLayout,
		private readonly labelFont: string,
		private readonly notationFont: string,
		topSlack: number,
		scratchHeight: number,
		private readonly topOverflow: Map<number, number>,
		opts: DrawPassOptions = {},
	) {
		this.lyricDrops = opts.lyricDrops ?? new Map();
		this.voltaLifts = opts.voltaLifts ?? new Map();
		const {
			measureCount,
			boxes,
			staveOffsets,
			systemStaveOffsets,
			totalStaves,
			softmaxFactor,
			systemGap,
			width,
			labelIndent,
			partLabelIndent,
		} = layout;
		this.measureCount = measureCount;
		this.boxes = boxes;
		this.staveOffsets = staveOffsets;
		this.systemStaveOffsets = systemStaveOffsets;
		this.totalStaves = totalStaves;
		this.softmaxFactor = softmaxFactor;
		this.systemGap = systemGap;
		this.labelIndent = labelIndent;
		this.partLabelIndent = partLabelIndent;
		const { measureNumbering, showTabSlideText } = config;
		this.measureNumbering = measureNumbering;
		this.showTabSlideText = showTabSlideText;
		this.showTabs = config.showTabs;
		this.showNotation = config.showNotation;
		this.notationColor = config.fonts.notation?.color ?? '#000000';
		this.textColor = config.fonts.text?.color ?? '#000000';
		this.parts = this.score.parts;
		this.gaps = gapsByMeasureIndex(config.gaps);
		// <multiple-rest> runs: the lead measure draws the consolidated bar instead of its own
		// notes, and the measures it swallows have no box (the layout planner dropped them), so
		// drawMeasureColumn returns early for them without any extra guard here.
		this.multiRests = this.reader.multiRestsOf(this.parts).leads;
		this.partGroups = partGroups(this.score);
		// A notation+TAB pair split across parts is ONE instrument that just happens to be
		// written as two parts, and it's bracketed as one (see partsPairTabWithNotation), so
		// its barline runs through the pair too — the barline run has to agree with what the
		// connector groups, or the bracket says "one instrument" while the gap says "two".
		this.barlineBreaks = partsPairTabWithNotation(
			this.parts,
			this.showTabs,
			this.showNotation,
		)
			? new Set<number>()
			: barlineBreaks(this.score);
		// <octave-shift> spans, resolved up front: every note under one draws an octave (or
		// two, or three) off its sounding pitch, so buildNotes needs the answer per note
		// before it builds anything, and the finish pass draws the brackets over them.
		for (const part of this.parts) {
			for (const span of this.reader.octaveShiftsOf(part)) {
				this.octaveShiftSpans.push(span);
				for (const note of span.notes) {
					this.octaveShiftByNote.set(note, span.octaves);
				}
			}
			this.directionLineSpans.push(...this.reader.directionLinesOf(part));
		}
		// Read from the first part — a repeat or volta boundary applies across the system.
		this.decorations = barlineDecorations(this.parts[0]?.measures ?? []);
		this.systemTopY = layout.top + topSlack;
		this.systemContentBottom = this.systemTopY;
		this.collisionResolver = new CollisionResolver(
			new Rect(0, 0, width, scratchHeight),
		);
		this.scratchViewport = new Rect(0, 0, width, scratchHeight);
	}

	run(): {
		pageTop: number;
		pageBottom: number;
		observedOverflow: Map<number, number>;
		observedStaveSpill: Map<number, Map<number, StaveSpill>>;
		observedLyricDrops: Map<string, number>;
		lyricsStepped: boolean;
		observedVoltaLifts: Map<number, number>;
		voltasLifted: boolean;
		rawNotes: RawNote[];
		rawMeasures: RawMeasure[];
		rawChordDiagrams: RawChordDiagram[];
	} {
		// The context's default ink: every vexflow glyph with no explicit style inherits it, and it
		// survives the save()/restore() pairs below since it's set before any of them. A fresh canvas
		// (or a resize between passes) resets to black, so setting black here is a no-op — a colored
		// score is the only thing this changes. Text vexml types itself overrides to textColor inline.
		this.context.setFillStyle(this.notationColor);
		this.context.setStrokeStyle(this.notationColor);
		// Stems ignore the context stroke above: Stem.drawWithStyle paints them with
		// Metrics.Stem.strokeStyle (hardcoded 'black') on top of it. Override that metric too —
		// global VexFlow state like setFonts, reset to the default black when no color is set so an
		// uncolored render stays byte-identical and no color leaks into the next render.
		MetricsDefaults.Stem.strokeStyle = this.notationColor;
		Metrics.clear('Stem');
		for (let m = 0; m < this.measureCount; m++) {
			this.drawMeasureColumn(m);
		}
		return this.finishPass();
	}

	/*
	 * One iteration of the measure loop: place and draw measure `m`'s staff column
	 * across every part, then its notes, annotations, and connectors.
	 */
	private drawMeasureColumn(m: number): void {
		const box = this.boxes[m];
		if (!box) {
			return;
		}
		this.measureX = box.x;
		this.measureWidth = box.width;
		this.measureTrailingPad = box.trailingPad;
		this.measureLeadingPad = box.leadingPad;
		this.systemIndex = box.systemIndex;
		this.isSystemStart = box.isSystemStart;
		// The last measure DRAWN, not the last in the document: a <multiple-rest> run reaching
		// the end of the score leaves the measures after its lead boxless, and the thin-thick
		// end barline belongs on the lead.
		this.isLastMeasure = !this.boxes.some(
			(later, index) => index > m && later !== undefined,
		);
		// An explicit right <barline> with a <bar-style> replaces this measure's end divider
		// (normally a plain single line, or the thin-thick end on the final measure). Read
		// from the first part — a barline is a boundary of the whole system, not of one staff.
		this.barStyle =
			this.parts[0]?.measures[m]?.barlines.find((b) => b.location === 'right')
				?.barStyle ?? null;
		// A backward repeat butted against the next measure's forward repeat is one boundary,
		// so it prints as a single back-to-back sign (dots, thin-thick-thin, dots) and the next
		// measure skips its own opening dots. Across a system break the two edges are on
		// different lines and each draws in full, as engraving convention wants.
		this.decoration = this.decorations[m] ?? NO_DECORATION;
		const nextBegins = this.decorations[m + 1]?.repeatBegin === true;
		const nextIsSystemStart = this.boxes[m + 1]?.isSystemStart === true;
		this.repeatBoth =
			this.decoration.repeatEnd && nextBegins && !nextIsSystemStart;
		this.suppressBegRepeat =
			!this.isSystemStart && this.decorations[m - 1]?.repeatEnd === true;
		// A gap is non-musical, so it never shows a measure number (its neighbors keep
		// their own printed numbers — insertion shifts indexes, not labels).
		this.showMeasureNumber =
			!this.gaps.has(m) &&
			showsMeasureNumber(this.measureNumbering, m, this.isSystemStart);
		this.measureNumbered = false;
		this.beginSystem();
		this.systemY = this.systemTopY;
		this.staveRow = 0;
		this.systemTop = undefined;
		this.systemBottom = undefined;
		this.systemPending = [];
		this.columnVoltaBase = null;
		this.columnStaves = [];
		this.columnMultiRests = [];
		this.tempoTasks = [];
		this.harmonyTasks = [];
		this.wordsTasks = [];
		this.dynamicsTasks = [];
		this.figuredBassTasks = [];
		this.partStaves = [];

		for (const [partIndex, part] of this.parts.entries()) {
			// The staves this part actually renders: with showTabs/showNotation off, its
			// tab/notation staves are dropped. staveRow indexes into staveOffsets, which the
			// layout planner built from this same visible set, so the two stay aligned.
			const staves = visibleStaffNumbers(part, {
				showTabs: this.showTabs,
				showNotation: this.showNotation,
			});
			const measure = part.measures[m];
			if (!measure) {
				this.staveRow += staves.length;
				continue;
			}

			let partTop: Stave | undefined;
			let partBottom: Stave | undefined;
			this.pendingStaves = [];

			for (const staffNumber of staves) {
				const stave = this.buildStave(
					part,
					measure,
					m,
					staffNumber,
					staves.length,
				);
				partTop ??= stave;
				partBottom = stave;
			}
			if (partTop && partBottom) {
				// Remembered per part so a <part-group> connector spanning several parts can
				// reach from the first member's top stave to the last member's bottom one.
				this.partStaves[partIndex] = { top: partTop, bottom: partBottom };
			}
			// Every stave of the part has registered its notes in byLead by now, so a beamed
			// run that changes staff mid-group can finally resolve all of them.
			this.buildPartBeams();

			// Defer formatting to one pass over the whole system (below) so notes align
			// across parts, not just within this part.
			this.systemPending.push(...this.pendingStaves);
			for (const p of this.pendingStaves) {
				this.rowByStave.set(p.stave, p.row);
				this.systemByStave.set(p.stave, this.systemIndex);
			}

			// Chord symbols from this measure's <harmony> elements, each bound to the
			// lead note it sits above. Resolved via byLead (the notation staff's notes),
			// falling back to the tab note so a tab-only part keeps its chord symbols.
			for (const { lead, text, frame, source } of this.reader.harmoniesOf(
				measure,
			)) {
				const staveNote = this.byLead.get(lead) ?? this.byTabLead.get(lead);
				if (staveNote) {
					this.harmonyTasks.push({
						staveNote,
						text,
						frame,
						source,
					});
				}
			}

			// A metronome mark (from a <direction><metronome>) prints on this part's top
			// staff wherever it appears — the piece start or a mid-piece tempo change.
			// Drawn after the system is formatted so it can clear a high first note.
			// The rate ("quarter = 60") and a note-group relation (a swing figure) are separate
			// <metronome> elements, routinely both in the same <direction>. They print side by
			// side as one mark, so they travel together and are placed as one box.
			const tempo = this.reader.tempoOf(measure);
			const modulation = this.reader.modulationOf(measure);
			const topStave = this.pendingStaves[0];
			if ((tempo || modulation) && topStave) {
				this.tempoTasks.push({ stave: topStave.stave, tempo, modulation });
			}

			// Words directions (e.g. "ritardando") print on the staff their <staff> names,
			// falling back to this part's top staff when that staff isn't rendered, and
			// anchored at the note the direction precedes (its first note when it names
			// none). Drawn after the system is formatted so that note's x is real.
			for (const { text, staffNumber, lead, placement } of this.reader.wordsOf(
				measure,
			)) {
				const target =
					this.pendingStaves[staves.indexOf(staffNumber)] ?? topStave;
				if (target) {
					const anchor = lead
						? (this.byLead.get(lead) ?? this.byTabLead.get(lead))
						: undefined;
					this.wordsTasks.push({
						stave: target.stave,
						text,
						anchor: anchor ?? target.staveNotes[0],
						placement,
					});
				}
			}

			// Dynamics markings, bound to their staff and lead note exactly like words —
			// they differ only in the face they're typed in and in defaulting below the staff.
			for (const {
				text,
				glyph,
				staffNumber,
				lead,
				placement,
			} of this.reader.dynamicsOf(measure)) {
				// A marking that just restates the dynamic already sounding on this staff
				// prints nothing — some exporters (GuitarPro) repeat the level on every
				// measure. Only sustained LEVELS dedupe: sfz/fp/rfz and friends are per-note
				// accents, so a repeat of one is meaningful and always prints.
				const key = `${partIndex}:${staffNumber}`;
				if (SUSTAINED_DYNAMIC.test(text)) {
					const sounding = this.soundingDynamic.get(key);
					const redundant =
						sounding?.text === text &&
						m - sounding.measure <= DYNAMIC_RESTATE_GAP;
					// Stamped on every statement, printed or not: a suppressed one still
					// keeps the run alive, so an unbroken per-measure chain stays suppressed
					// end to end instead of resurfacing every other measure.
					this.soundingDynamic.set(key, { text, measure: m });
					if (redundant) {
						continue;
					}
				}
				const target =
					this.pendingStaves[staves.indexOf(staffNumber)] ?? topStave;
				if (target) {
					const anchor = lead
						? (this.byLead.get(lead) ?? this.byTabLead.get(lead))
						: undefined;
					this.dynamicsTasks.push({
						stave: target.stave,
						text,
						glyph,
						anchor: anchor ?? target.staveNotes[0],
						placement,
					});
				}
			}

			// <figured-bass> stacks. They belong under the bass line they figure, so unlike
			// words/dynamics there is no <staff> to route by: they hang off the part's LAST
			// stave, which on a two-stave continuo part is the bass one.
			const bassStave = this.pendingStaves.at(-1);
			if (bassStave) {
				for (const { lead, figures } of this.reader.figuredBassesOf(measure)) {
					this.figuredBassTasks.push({
						stave: bassStave.stave,
						figures,
						anchor: this.byLead.get(lead) ?? this.byTabLead.get(lead),
					});
				}
			}

			// Pedal markers, resolved into PedalMarkings over the whole score (a pedal
			// can span barlines) after every note is placed — see below the measure loop.
			this.allPedals.push(...this.reader.pedalsOf(measure));
			this.allWedges.push(...this.reader.wedgesOf(measure));

			// A part's own staves are joined at each system start by the symbol named in
			// <part-symbol> (brace by default; bracket for guitar notation+tab pairs).
			// 'none' suppresses the connector entirely.
			const symbol = partSymbol(part, {
				showTabs: this.showTabs,
				showNotation: this.showNotation,
			});
			if (
				partTop &&
				partBottom &&
				staves.length > 1 &&
				this.isSystemStart &&
				symbol
			) {
				// Match the cross-part path: a bracket's x comes entirely from its top
				// stave, so nudge it 4px left to sit just outside the system line with a
				// small gap, then restore. A brace keeps its own placement.
				if (symbol === 'bracket') {
					partTop.setX(this.measureX - BRACKET_X_SHIFT);
				}
				new StaveConnector(partTop, partBottom)
					.setType(symbol)
					.setContext(this.context)
					.draw();
				partTop.setX(this.measureX);
			}

			// Print the instrument name in the first system's reserved left indent,
			// right-aligned just before the stave and vertically centered on the part's
			// staves.
			if (
				this.labelIndent > 0 &&
				part.label &&
				this.systemIndex === 0 &&
				this.isSystemStart &&
				partTop &&
				partBottom
			) {
				this.context.save();
				this.context.setFont(this.labelFont, LABEL_FONT_SIZE);
				this.context.setFillStyle(this.textColor);
				const tw = this.context.measureText(part.label).width;
				// Center on the staff lines themselves: top line of the part's first stave
				// to bottom line of its last, so a single stave centers on its middle line
				// and a multi-stave part centers on the group. +1.5 lands the cap-height
				// visual center on cy (a plain baseline at cy sits ~2.5px low).
				const cy = (partTop.getYForLine(0) + partBottom.getBottomLineY()) / 2;
				// Right-align every label to a fixed gap before the stave, so all parts'
				// names end at the same x (the gap clears the brace on multi-stave parts).
				this.context.fillText(
					part.label,
					this.measureX - LABEL_GAP - tw,
					cy + 1.5,
				);
				this.context.restore();
			}
		}

		// The whole column exists now, so the modifiers that belong to the measure rather
		// than to one stave — the opening repeat, the time signature — can be squared up
		// across its staves before any of them is committed to the canvas.
		this.begRepeatX = alignBegModifiers(this.columnStaves);
		for (const stave of this.columnStaves) {
			stave.setContext(this.context).draw();
			this.drawCustomBarline(stave);
		}
		// The consolidated multi-bar rests, over the staves that just landed: the thick
		// horizontal bar with its measure count centered above. Drawn straight onto the stave
		// rather than as a tickable — it stands for the whole measure, so there is nothing for
		// the formatter to space it against.
		for (const { stave, count } of this.columnMultiRests) {
			// vexflow measures its padding from the stave's x, so the left inset has to clear
			// the clef/key/time first — otherwise the bar starts under the time signature and
			// ends well short of the barline instead of centering in the note area.
			new MultiMeasureRest(count, {
				numberOfMeasures: count,
				paddingLeft: stave.getNoteStartX() - stave.getX() + MULTI_REST_PADDING,
				paddingRight: MULTI_REST_PADDING,
			})
				.setStave(stave)
				.setContext(this.context)
				.draw();
		}

		// Format and draw every part's staves together so same-tick notes line up
		// vertically across the whole system (notation over its own tab, and across
		// separate parts that share a beat).
		const noteExtent = this.formatAndDrawSystem(this.systemPending);
		this.pageBottom = Math.max(this.pageBottom, noteExtent.bottom);
		this.systemContentBottom = Math.max(
			this.systemContentBottom,
			noteExtent.bottom,
		);
		this.pageTop = Math.min(this.pageTop, noteExtent.top);

		this.collectGeometry(m, noteExtent.top);
		this.drawGapOverlay(m);

		if (noteExtent.top < Infinity) {
			this.systemHighestTop.set(
				this.systemIndex,
				Math.min(
					this.systemHighestTop.get(this.systemIndex) ?? Infinity,
					noteExtent.top,
				),
			);
			// A bracket over this measure and notes that climb past where it sits: record how
			// far the whole system's brackets have to rise so the next pass can draw them clear
			// of the noteheads and ledger lines. Also fed to systemHighestTop, so the headroom
			// reserved above this system already covers where the bracket is about to move.
			if (this.columnVoltaBase !== null) {
				const lift = Math.max(
					0,
					this.columnVoltaBase - noteExtent.top + VOLTA_NOTE_CLEARANCE,
				);
				if (lift > (this.observedVoltaLifts.get(this.systemIndex) ?? 0)) {
					this.observedVoltaLifts.set(this.systemIndex, lift);
					this.systemHighestTop.set(
						this.systemIndex,
						Math.min(
							this.systemHighestTop.get(this.systemIndex) ?? Infinity,
							this.columnVoltaBase - lift,
						),
					);
				}
			}
		}
		this.drawAnnotations(m);
		this.drawConnectors();
	}

	private beginSystem(): void {
		if (this.systemIndex !== this.currentSystem) {
			if (this.currentSystem >= 0) {
				// Gap below the previous system, plus room reserved for this system's own
				// upward overflow (high notes/ledger lines) so they clear it, not collide.
				this.systemTopY =
					this.systemContentBottom +
					this.systemGap +
					(this.topOverflow.get(this.systemIndex) ?? 0);
			}
			this.currentSystem = this.systemIndex;
			this.systemContentBottom = this.systemTopY;
			this.systemTopByIndex.set(this.systemIndex, this.systemTopY);
			// Leaving the previous system: flag anything that escaped the canvas, then reset
			// the collision index so the new system (coordinates restart) starts clean.
			this.warnEscapes();
			this.collisionResolver.clear();
		}
	}

	/*
	 * One iteration of the stave loop: build measure `m`'s stave for the given part-staff
	 * (clef/key/time/barlines), draw it, and queue its notes for the system format.
	 * `visibleCount` is how many staves the part renders (tab/notation staves may be hidden).
	 */
	private buildStave(
		part: Part,
		measure: Measure,
		m: number,
		staffNumber: string,
		visibleCount: number,
	): Stave {
		const clef = measure.getClef(staffNumber);
		// Each system gets its own offsets once pass one has measured it (a bar that needs a
		// wide grand-staff gap doesn't spread its neighbours apart); pass one has none yet.
		const offsets =
			this.systemStaveOffsets?.get(this.systemIndex) ?? this.staveOffsets;
		const staveY = this.systemY + (offsets[this.staveRow] ?? 0);

		// A TAB clef draws on a TabStave whose line count matches the
		// instrument's strings (<staff-lines>: 6 for guitar, 4 for bass).
		const isTab = isTabStaff(part, staffNumber);
		const tabLines = isTab ? measure.getStaveLines(staffNumber) : 0;
		const staveLines = measure.getStaveLines(staffNumber);
		// Half the lines a reduced stave drops come off the top. The whole part of that says
		// which five-line row it starts on; the leftover half (an even line count can't sit on
		// the five-line rows) nudges the whole frame — lines and note rows together — down a
		// half space, which is how an even-line stave centers.
		const hiddenAbove = Math.max(0, Math.floor((5 - staveLines) / 2));
		const halfNudge = Math.max(0, (5 - staveLines) / 2 - hiddenAbove);
		const stave = isTab
			? new TabStave(this.measureX, staveY, this.measureWidth, {
					numLines: tabLines,
				})
			: new Stave(this.measureX, staveY, this.measureWidth, {
					// A reduced stave keeps the five-line frame and HIDES the lines it doesn't
					// draw, rather than declaring fewer of them. vexflow anchors a shorter stave
					// at the top — its lines come off the bottom, so a 1-line percussion stave
					// draws where a five-line stave's TOP line goes — while leaving note rows,
					// ledger lines, clef and time signature in the five-line frame regardless.
					// Hiding instead centers the drawn lines the way MuseScore and OSMD do (the
					// single line lands on the middle line, with the percussion clef straddling
					// it) and leaves everything measured off the stave — note rows, connectors,
					// part spacing — exactly as it was.
					spaceAboveStaffLn: 4 + halfNudge,
				});
		// Tab is exempt: its line count IS its string count, so a 4-string stave draws four
		// lines and means it.
		for (let line = 0; line < 5 && !isTab && staveLines < 5; line++) {
			stave.setConfigForLine(line, {
				visible: line >= hiddenAbove && line < hiddenAbove + staveLines,
			});
		}
		// Only draw the end barline. Each measure's end barline is the same line
		// as the next measure's left edge, so internal measures still get a divider;
		// only the first measure of a system loses its left barline (intended). The
		// final measure of the piece closes with a thin-thick end barline.
		// When the system has multiple staves, the per-measure stave connector
		// already draws this line across the staves, so the per-stave end barline
		// is suppressed to avoid doubling it.
		// Exception: a lone TAB stave has no system connector to close its left
		// edge, so its system-start measure draws an explicit begin barline.
		// Repeat signs are the exception to the multi-stave suppression: no StaveConnector type
		// draws repeat dots, so every stave draws the whole sign itself and drawConnectors
		// retraces just the bars across the system.
		const repeatBegin = this.decoration.repeatBegin && !this.suppressBegRepeat;
		stave.setBegBarType(
			repeatBegin
				? Barline.type.REPEAT_BEGIN
				: isTab && this.totalStaves === 1 && this.isSystemStart
					? Barline.type.SINGLE
					: Barline.type.NONE,
		);
		// A <bar-style> vexflow has no type for is set to NONE here and painted by
		// drawCustomBarline once the stave is on the canvas; 'none' is genuinely no line, so
		// it takes NONE and no repaint. A repeat sign outranks any bar style — MusicXML puts
		// the two in the same <barline>, and the repeat is the one that changes what's played.
		const styled = this.barStyle ? BAR_STYLE_TYPES[this.barStyle] : undefined;
		stave.setEndBarType(
			this.repeatBoth
				? Barline.type.REPEAT_BOTH
				: this.decoration.repeatEnd
					? Barline.type.REPEAT_END
					: this.totalStaves > 1
						? Barline.type.NONE
						: this.barStyle
							? (styled ?? Barline.type.NONE)
							: this.isLastMeasure
								? Barline.type.END
								: Barline.type.SINGLE,
		);
		// The volta (ending) bracket rides above the top stave of the system only — it labels
		// the passage, not each instrument. Registered as an obstacle after the draw below so
		// chord symbols and words in the same measure lift clear of it.
		// vexflow anchors a volta at getYForTopText(numLines) — five text lines up, far above
		// everything else vexml draws — so shift it back down to a fixed gap over the top staff
		// line, in the same band as the other above-stave decorations.
		// The bracket is drawn with the stave, before the notes are formatted, so a measure
		// whose notes climb past that gap can't be seen yet — the lift that clears them is
		// measured on the previous pass and arrives per system in voltaLifts. Per SYSTEM, not
		// per measure: one bracket spans its measures as separate BEGIN/MID/END stave voltas,
		// and heights that disagree would draw it as a staircase.
		const volta = this.decoration.volta;
		const voltaBase = stave.getYForLine(0) - VOLTA_STAVE_GAP;
		const voltaTop = voltaBase - (this.voltaLifts.get(this.systemIndex) ?? 0);
		if (volta && this.staveRow === 0) {
			this.columnVoltaBase = voltaBase;
			stave.setVoltaType(
				volta.type,
				volta.label,
				voltaTop - stave.getYForTopText(stave.getNumLines()),
			);
		}

		// The previous measure's effective signatures (carried forward), used to
		// spot a mid-system change. getClef/getKey/getTime return what's in effect at
		// the measure start, so M3 of a piece that changed key at M2 reads the same
		// key as M2 — no spurious redraw.
		const prevMeasure = part.measures[m - 1];
		const key = measure.getKey(staffNumber);
		const prevKey = prevMeasure?.getKey(staffNumber) ?? null;
		const keyChanged =
			this.reader.keyIdentity(key) !== this.reader.keyIdentity(prevKey);
		const clefName = clef
			? this.translator.vexflowClef(clef.sign, clef.line)
			: 'treble';
		// A <key> spelled out accidental by accidental (<key-step>/<key-alter>), which vexflow's
		// own KeySignature can't take a spec for; empty for an ordinary <fifths> key. The
		// positions depend on the clef, so this is read per stave.
		const customKey = key && !isTab ? customKeyAccidentals(key, clefName) : [];
		// The key being replaced, so vexflow can print the naturals that cancel it — the
		// only thing a change TO C major has to draw, and without it M2 of
		// transpose_change looked like no change happened at all. vexflow applies the
		// modern rule itself (cancel only the accidentals dropped, or all of them when
		// sharps flip to flats), so this hands it the old spec and lets it decide.
		// Only at a change: restating an unchanged key at a system start cancels nothing.
		// A non-traditional key has no spec to cancel with, either side of the change.
		const cancelKeySpec =
			keyChanged && prevKey?.rootNote && customKey.length === 0
				? vexflowKeySpec(prevKey)
				: undefined;
		const addKeySignature = () => {
			if (customKey.length > 0) {
				stave.addModifier(
					new CustomKeySignature(customKey).setPosition(
						StaveModifierPosition.BEGIN,
					),
					StaveModifierPosition.BEGIN,
				);
			} else if (key?.rootNote) {
				stave.addKeySignature(vexflowKeySpec(key), cancelKeySpec);
			}
		};
		// Against the clef in effect at the END of the previous measure, not at its start: a
		// change stated INSIDE that measure (or as its trailing courtesy clef) has already
		// been announced, so restating it here would draw the same glyph twice.
		const clefChanged =
			m > 0 &&
			this.translator.vexflowClefSpec(clef) !==
				this.translator.vexflowClefSpec(
					this.reader.clefAtEndOf(prevMeasure, staffNumber),
				);

		// Clef and key print at every system start (re-stated on each new line).
		// A mid-system clef or key change is also redrawn where it happens (the time
		// signature is not repeated for either). The changed clef is drawn at the
		// small "change clef" size, which is how a mid-piece clef change is engraved —
		// it reads as a correction to the stave, not a fresh system opening.
		if (this.isSystemStart) {
			if (isTab) {
				const tabStave = stave as TabStave;
				tabStave.addTabGlyph();
				this.resizeTabClef(tabStave, tabLines);
			} else {
				// A part that declares no <clef> at all is engraved as treble — the same
				// fallback buildNotes already positions its notes with, and what MuseScore and
				// OSMD draw. Without it the stave opened with an empty gap where the glyph
				// belongs (the lead width reserves the room either way).
				stave.addClef(
					clefName,
					undefined,
					this.translator.vexflowClefAnnotation(clef?.octaveChange ?? null),
				);
			}
			// Tab staves carry no key signature.
			if (!isTab) {
				addKeySignature();
			}
		} else {
			if (clef && clefChanged && !isTab) {
				stave.addClef(
					this.translator.vexflowClef(clef.sign, clef.line),
					'small',
					this.translator.vexflowClefAnnotation(clef.octaveChange),
				);
			}
			if (keyChanged && !isTab) {
				addKeySignature();
			}
		}

		// Unlike clef and key, the time signature is not re-stated at every
		// system start — only at the piece start and wherever the meter changes
		// (a change that lands on a system break still redraws here).
		//
		// A part that states no <time> anywhere opens in 4/4, the meter a reader assumes when
		// none is printed — the counterpart of the treble-clef fallback above. An explicit
		// <senza-misura> is a different thing and still prints nothing.
		// ponytail: the DEFAULT is display-only — meterBeats still reports 0 for an absent
		// <time>, so an unmetered measure is sized by its own content rather than padded out
		// to four beats. Printing an assumed meter is a convention; spacing to one would be
		// guessing at the music.
		const time = measure.getTime(staffNumber);
		const timeSpec =
			timeSignatureSpec(time) ?? (m === 0 && !time ? '4/4' : null);
		const prevTimeSpec = timeSignatureSpec(
			prevMeasure?.getTime(staffNumber) ?? null,
		);
		if (timeSpec && !isTab && (m === 0 || timeSpec !== prevTimeSpec)) {
			stave.addTimeSignature(timeSpec);
		}

		// A bracket (drawn below) has a top curl that sits where vexflow's
		// setMeasure centers the measure number, so the number gets occluded — true
		// for a multi-stave part's own bracket, for the system bracket of a
		// notation+tab pair split across parts, and for a <part-group> bracket that
		// starts on the top part (the only one whose curl reaches the number). Only
		// for a bracket do we draw the number ourselves, left-aligned just right of
		// the barline and lifted above the curl; the curly brace doesn't reach that
		// high, so it keeps vexflow's placement. The number prints once
		// (measureNumbered), on the top stave.
		const numberOccluded =
			this.isSystemStart &&
			((visibleCount > 1 &&
				partSymbol(part, {
					showTabs: this.showTabs,
					showNotation: this.showNotation,
				}) === 'bracket') ||
				partsPairTabWithNotation(
					this.parts,
					this.showTabs,
					this.showNotation,
				) ||
				this.partGroups.some(
					(group) => group.symbol === 'bracket' && group.fromPart === 0,
				));
		if (this.showMeasureNumber && !this.measureNumbered && !numberOccluded) {
			stave.setMeasure(Number(measure.number));
			// vexflow centers the number on the stave's x, baselined 3px under its top-text
			// line (Stave.draw).
			this.context.save();
			this.context.setFont(stave.getFont());
			this.addMeasureNumberObstacle(
				String(Number(measure.number)),
				stave.getX(),
				stave.getYForTopText(0) + 3,
				true,
			);
			this.context.restore();
			this.measureNumbered = true;
		}

		// Queued, not drawn: the column's staves are drawn together once they all exist, so a
		// repeat sign can be aligned across them first (see alignBegRepeats).
		this.columnStaves.push(stave);

		// The volta bracket is drawn with the stave, so register the band it occupies as an
		// obstacle now: chord symbols and words placed later in this measure lift clear of it
		// instead of overprinting the bracket and its "1." label. The label hangs below the
		// bracket line, so the box runs from the line down past the text.
		if (volta && this.staveRow === 0) {
			const rect = new Rect(
				stave.getX(),
				voltaTop,
				stave.getWidth(),
				VOLTA_LABEL_DROP,
			);
			this.collisionResolver.add({ rect, kind: 'annotation' });
			this.growDecorationTop(this.systemIndex, rect.y);
			this.pageTop = Math.min(this.pageTop, rect.y);
			this.systemHighestTop.set(
				this.systemIndex,
				Math.min(
					this.systemHighestTop.get(this.systemIndex) ?? Infinity,
					rect.y,
				),
			);
		}

		// The NEXT measure's bracket, registered a column early. A chord symbol is anchored at
		// its note's x and runs right from there, so one on this measure's last beat overruns
		// the barline into the next measure — where a volta may start, putting "G♯m11" right
		// under a "1.2.3." label. That bracket is otherwise only registered when its own column
		// is drawn, which is after this measure's annotations are placed, so the symbol would
		// never see it. Same system means the same top staff line, so the y above still holds;
		// the next column re-adds the identical rect, which changes nothing.
		const nextBox = this.boxes[m + 1];
		if (
			this.staveRow === 0 &&
			this.decorations[m + 1]?.volta &&
			nextBox?.systemIndex === this.systemIndex
		) {
			this.collisionResolver.add({
				rect: new Rect(nextBox.x, voltaTop, nextBox.width, VOLTA_LABEL_DROP),
				kind: 'annotation',
			});
		}

		if (this.showMeasureNumber && !this.measureNumbered && numberOccluded) {
			this.context.save();
			this.context.setFont(stave.getFont());
			this.context.setFillStyle(this.textColor);
			this.context.fillText(
				measure.number,
				stave.getX() + 4,
				stave.getYForTopText(0) - 14,
			);
			this.addMeasureNumberObstacle(
				measure.number,
				stave.getX() + 4,
				stave.getYForTopText(0) - 14,
				false,
			);
			this.context.restore();
			this.measureNumbered = true;
		}
		// Seed this row's spill record even when nothing is drawn on it, so the re-spacing
		// pass still knows where its staff lines sit (a tab stave is taller than a
		// notation one, and an empty stave still occupies its height).
		this.spillOf(this.systemIndex, this.staveRow, stave);
		const staveBottom = stave.getBottomY();
		this.pageBottom = Math.max(this.pageBottom, staveBottom);
		this.systemContentBottom = Math.max(this.systemContentBottom, staveBottom);

		// Build this staff's notes; they're formatted and drawn together with the
		// rest of the part's staves below. A TAB stave builds fretted TabNotes;
		// everything else uses the notation path. An empty voice (no chords) would
		// crash the formatter, so it's filtered.
		// A <multiple-rest> lead draws the consolidated bar in place of its own contents — the
		// whole rest it holds stands for the run and would otherwise print on top of the bar.
		const multiRestCount = this.multiRests.get(m);
		if (multiRestCount) {
			this.columnMultiRests.push({ stave, count: multiRestCount });
			this.systemTop ??= stave;
			this.systemBottom = stave;
			this.staveRow++;
			return stave;
		}

		const voices = this.reader.staffVoices(measure.voices, staffNumber);
		if (isTab && voices.length > 0) {
			this.pendingStaves.push(
				this.buildTabNotes(
					stave as TabStave,
					this.staveRow,
					voices,
					stringTuning(part, staffNumber),
				),
			);
			for (const voice of voices) {
				this.allTabChords.push(...voice.chords);
			}
		} else if (voices.length > 0) {
			const clefName = clef
				? this.translator.vexflowClef(clef.sign, clef.line)
				: 'treble';
			this.pendingStaves.push(
				this.buildNotes(
					stave,
					this.staveRow,
					voices,
					clefName,
					this.reader.meterFloor(measure, staffNumber),
					clef?.octaveChange ?? 0,
					this.reader.midBarlinesOf(measure),
					this.translator.midClefSpecs(
						this.reader.midClefsOf(measure, staffNumber),
					),
				),
			);
			for (const voice of voices) {
				this.allChords.push(...voice.chords);
			}
		}

		this.systemTop ??= stave;
		this.systemBottom = stave;
		this.staveRow++;
		return stave;
	}

	/*
	 * Build a notation staff's notes into vexflow voices. Each mdom voice becomes a
	 * vexflow voice; multiple voices are aligned together and stem apart. Beams and
	 * tuplets are per-voice (positional) and built here; ties and slurs can span
	 * measures, so the caller resolves them once over the whole score (this only
	 * records each chord's StaveNote in the shared `byLead` map).
	 */
	private buildNotes(
		stave: Stave,
		row: number,
		voices: StaffVoice[],
		clef: string,
		meterFloor: number,
		clefOctaveShift: number,
		barlines: { beat: number; style: string }[],
		midClefs: MidClefSpec[],
	): PendingStave {
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
						if (modifier instanceof LyricAnnotation) {
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
	 * Build the Beams for the part whose staves were just added to `pendingStaves`, from the
	 * groups each stave recorded in buildNotes.
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
	private buildPartBeams(): void {
		// StaveNote -> the stave row it was built on, which is what orders a split chord's
		// halves top staff first.
		const rowOf = new Map<StaveNote, number>();
		// A chord split across staves draws as one StaveNote per staff, but only the half
		// holding the chord's own lead is reachable through byLead — the other half's chord
		// leads with a <chord/> member. Index those by voice and onset so their group can pick
		// them up too; without it the split-off half draws a flag beside the beam.
		const splitHalves = new Map<string, StaveNote[]>();
		const splitKey = (voice: string, beat: number | null) => `${voice}@${beat}`;
		for (const pending of this.pendingStaves) {
			for (const note of pending.staveNotes) {
				rowOf.set(note, pending.row);
			}
			for (const { note, chord } of pending.noteChords) {
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
		for (const pending of this.pendingStaves) {
			for (const { groups, defaultStem } of pending.beamPlans) {
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
							this.crossStaveNotes.add(note);
						}
						// Any value here only says "don't auto-stem" — the directions just set
						// are what the beam reads.
						stem = defaultStem ?? 'down';
					}
					pending.beams.push(
						...this.spanners.buildBeams(
							[group],
							this.byLead,
							stem,
							notesByLead,
						),
					);
				}
			}
			pending.beamPlans.length = 0;
			// After the beams, never before: vexflow's Tuplet omits its bracket when it finds
			// its notes already beamed, and draws a redundant one over the beam otherwise.
			for (const chords of pending.tupletChords) {
				pending.tuplets.push(
					...this.spanners.buildTuplets(chords, this.byLead),
				);
			}
			pending.tupletChords.length = 0;
		}
	}

	/*
	 * Build a tablature staff's notes into vexflow voices of TabNotes (fret numbers on
	 * their strings). Tab notes carry no clef/key, no ghost-note gap filling, and no
	 * beams — the roadmap cases are single-voice fretted lines — so this is a slimmer
	 * sibling of buildNotes. The bend/vibrato stretching and drawing happen in
	 * formatAndDrawSystem, after the part's staves are formatted together. Hammer-ons/
	 * pull-offs span measures, so the caller resolves them once over the whole score
	 * (this only records each chord's TabNote in the shared `byTabLead` map).
	 */
	private buildTabNotes(
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

	/*
	 * Format a system's staves together and draw their notes. A note's absolute x is its
	 * (shared) tick-context x plus its own stave's note-start x, so two things must hold
	 * for same-tick notes to line up across staves: a single Formatter shares the tick
	 * contexts, and every stave starts its note area at the same x. Staves are equalized
	 * to the widest note start (a treble clef is wider than the "TAB" glyph) — otherwise
	 * the columns shear apart even when the ticks match. Returns the topmost/lowest y any
	 * content reaches so the page can grow to fit high notes and deep ledger lines.
	 */
	private formatAndDrawSystem(pending: PendingStave[]): {
		top: number;
		bottom: number;
	} {
		if (pending.length === 0) {
			return { top: Infinity, bottom: 0 };
		}

		// The leading pad sits inside the stave but off-limits to the formatter, the mirror of
		// the trailing one below: the first note starts clear of the barline so a directive
		// centered on it prints in the gap instead of over the divider.
		const startX =
			Math.max(...pending.map((p) => p.stave.getNoteStartX())) +
			this.measureLeadingPad;
		let noteEndX = 0;
		for (const p of pending) {
			p.stave.setNoteStartX(startX);
			noteEndX = p.stave.getNoteEndX();
			for (const vexVoice of p.vexVoices) {
				vexVoice.setStave(p.stave);
				// Voice.setStave doesn't reach the tickables — Voice.draw does that, which is
				// too late for a cross-staff beam: it draws with its owning stave's row, before
				// the lower row's voices have drawn, so its notes a stave away still sit at the
				// stave-less origin and their stems shoot off the top of the page. Setting each
				// note's stave here is what Voice.draw would do anyway, just early enough for
				// every beam to read real y's.
				for (const note of vexVoice.getTickables()) {
					note.setStave(p.stave);
				}
			}
		}

		// joinVoices per stave (voices on one stave share accidental/stem columns), then
		// format every voice at once to share tick contexts across staves. The note area
		// was sized to a global px-per-tick, so spacing stays consistent across measures.
		const formatter = new Formatter({ softmaxFactor: this.softmaxFactor });
		for (const p of pending) {
			formatter.joinVoices(p.vexVoices);
		}
		const allVoices = pending.flatMap((p) => p.vexVoices);
		// The trailing pad is inside the stave but off-limits to the formatter, so the last
		// note stops short of the barline and its words directive prints in the gap.
		const justifyWidth =
			noteEndX - startX - Stave.defaultPadding - this.measureTrailingPad;
		formatter.format(allVoices, justifyWidth, { context: this.context });
		this.closeGraceGaps(allVoices);

		let bottom = 0;
		// Track how high content rises above the staves from each note's noteheads and its
		// (beam-extended) stem tip. Deliberately NOT note.getBoundingBox().getY(): that
		// unions in attached modifiers, and a GraceNoteGroup's box reports a bogus near-
		// origin y that would wrongly claim the note reaches the top of the page. Beams/
		// tuplets sit a hair higher than the stem; the PAGE_MARGIN_TOP buffer the crop keeps
		// above this top covers them (their own getBoundingBox is unreliable too).
		let top = Infinity;
		// A notation grace group's width, keyed by its main note's (shared) tick context, so a
		// tab grace group at the same tick can match its notation counterpart by identity.
		const notationGraceWidths = new Map<unknown, number>();
		for (const p of pending) {
			if (p.isTab) {
				continue;
			}
			for (const vexVoice of p.vexVoices) {
				for (const note of vexVoice.getTickables() as StaveNote[]) {
					const group = graceGroupOf(note);
					if (group) {
						notationGraceWidths.set(note.getTickContext(), group.getWidth());
					}
				}
			}
		}
		// One lyric baseline per stave row, shared by every measure of the system: a verse is a
		// line of text, so its syllables all have to hang at the same height. Measured here as
		// a DROP below the bottom staff line — how far this column's lowest note pushes the
		// verse past LYRIC_Y_OFFSET, so a note on ledger lines below the stave doesn't print
		// through its own syllable. The column can only see its own measure, so the drop the
		// rest of the system needs arrives from the previous pass (see observedLyricDrops);
		// on the first pass each column still rides its own notes and the verse steps.
		const lyricDrops = new Map<number, number>();
		for (const p of pending) {
			if (p.isTab) {
				continue;
			}
			const floorY = p.stave.getBottomLineY();
			let drop = Math.max(lyricDrops.get(p.row) ?? 0, LYRIC_Y_OFFSET);
			for (const note of p.staveNotes) {
				// The stave reaches the notes via Voice.draw, which hasn't run yet; the note
				// bounds need it now. Setting it early is what draw would do anyway.
				note.setStave(p.stave);
				drop = Math.max(
					drop,
					this.noteBottom(note) + LYRIC_NOTE_CLEARANCE - floorY,
				);
			}
			lyricDrops.set(p.row, drop);
			this.recordLyricDrop(p.row, drop);
		}
		for (const p of pending) {
			if (p.isTab) {
				// setStave before stretching so each note's getAbsoluteX() is in true stave
				// coordinates — the stretch helpers compare it against stave.getNoteEndX().
				const tabStave = p.stave as TabStave;
				// Center each fret (and its cleared staff-line gap) under the notation
				// notehead, which is left-anchored at the shared start x: shift the tab note
				// area right by half a notehead. Safe post-format — the stave is already drawn
				// (line ~527) and the formatter never reads getAbsoluteX, so only the notes,
				// their gaps, and note-anchored modifiers (bends/annotations) move.
				tabStave.setNoteStartX(startX + this.translator.noteheadHalfWidth());
				for (const vexVoice of p.vexVoices) {
					for (const note of vexVoice.getTickables()) {
						note.setStave(tabStave);
					}
				}
				this.stretchVibratos(tabStave, p.vexVoices);
				this.stretchBends(tabStave, p.vexVoices);
				this.alignTabGraces(p.vexVoices, notationGraceWidths);
			}
			this.pinTechnicals(p);
			this.pinLyrics(
				p,
				p.stave.getBottomLineY() +
					Math.max(
						lyricDrops.get(p.row) ?? LYRIC_Y_OFFSET,
						this.lyricDrops.get(this.lyricRowKey(p.row)) ?? 0,
					),
			);
			for (const vexVoice of p.vexVoices) {
				for (const note of vexVoice.getTickables()) {
					// A mid-measure BarNote or ClefNote has no stem and no ledger lines to
					// restyle; both draw in the context ink like the stave does.
					if (note instanceof BarNote || note instanceof ClefNote) {
						continue;
					}
					// VexFlow's Metrics hand every Stem a hardcoded strokeStyle:'black' that its
					// drawWithStyle lays over the context ink — so stems ignore notation.color while
					// the noteheads/staves/clefs it colors don't. Restyle each note's stem to match.
					// Covers beamed stems too: the beam renders this same Stem object.
					(note as StemmableNote).getStem()?.setStyle({
						strokeStyle: this.notationColor,
					});
					// Ledger lines use the stave's hardcoded defaultLedgerLineStyle (gray #444),
					// overriding the context ink the same way. Only restyle when a notation color
					// is set so an uncolored render stays byte-identical; lineWidth is left to the
					// stave default.
					if (this.notationColor !== '#000000' && note instanceof StaveNote) {
						note.setLedgerLineStyle({ strokeStyle: this.notationColor });
					}
				}
			}
			// The score's own per-element colors (<note color>, <notehead color>, <stem color>)
			// go on last so they win over the configured notation ink above.
			for (const { note, chord } of [...p.noteChords, ...p.graceChords]) {
				applyNoteColors(note, chord);
			}
			for (const vexVoice of p.vexVoices) {
				vexVoice.draw(this.context, p.stave);
			}
			// The mid-measure dividers vexflow drew nothing for: their BarNote reserved the
			// width and now has a formatted x, so paint the real stroke over it.
			for (const { note, style } of p.midBars) {
				this.paintBarStyle(p.stave, note.getAbsoluteX(), style);
			}
			for (const beam of p.beams) {
				beam.setContext(this.context).draw();
			}
			for (const tuplet of p.tuplets) {
				tuplet.setContext(this.context).draw();
			}
			for (const note of p.staveNotes) {
				const box = note.getBoundingBox();
				bottom = Math.max(bottom, box.getY() + box.getH());
				top = Math.min(top, this.noteTop(note), this.accidentalTop(note));
				// The page still has to fit a cross-staff stem (hence `top`/`bottom` above
				// reading it), but the gap between the staves does not — see crossStaveNotes.
				const heads = this.crossStaveNotes.has(note)
					? note.getNoteHeadBounds()
					: null;
				const spillTop = heads ? heads.yTop : this.noteTop(note);
				const spillBottom = heads ? heads.yBottom : box.getY() + box.getH();
				// The note's own x span, so the gap only opens where this note actually sits
				// over (or under) the neighbouring stave's music — not everywhere in the system.
				this.recordStaveSpill(
					p,
					new Rect(box.getX(), spillTop, box.getW(), spillBottom - spillTop),
				);
				// Register each note as a collision obstacle now that its position is final, so the
				// above-stave annotations drawn next can be nudged clear of it (and of high ties).
				this.collisionResolver.add({
					rect: this.noteRect(note),
					kind: 'note',
					band: p.row,
				});
				if (p.tiedNotes.has(note) && note.getStemDirection() === Stem.DOWN) {
					this.collisionResolver.add({
						rect: this.tieApexRect(note),
						kind: 'tie',
						band: p.row,
					});
				}
			}
			for (const { note, chord } of p.tabChords) {
				const rect = this.tabArcApexRect(p.stave, note, chord.lead);
				if (rect) {
					this.collisionResolver.add({ rect, kind: 'tie', band: p.row });
				}
				const bend = this.tabBendRect(p.stave, note);
				if (bend) {
					this.collisionResolver.add({ rect: bend, kind: 'note', band: p.row });
				}
			}
			// A slur bows into the same band the above-stave annotations drawn next sit in,
			// and it can't yield — it's pinned to its noteheads — so it's an obstacle, the
			// way a tie's apex is. The real curves are built (and drawn) in finishPass; this
			// rebuilds them over this stave's own chords just to measure the bow.
			//
			// ponytail: within-measure slurs only. A bow crossing a barline has one endpoint
			// outside `noteChords`, so slurSpans never pairs it and it registers nothing —
			// widen to the system's chords if a wrapping bow ever collides with text.
			for (const slur of this.spanners.buildSlurs(
				p.noteChords.map(({ chord }) => chord),
				this.byLead,
			)) {
				if (slur.stave === p.stave && !slur.crossStave) {
					this.collisionResolver.add({
						rect: new Rect(
							slur.left,
							slur.top,
							slur.right - slur.left,
							slur.bottom - slur.top,
						),
						kind: 'tie',
						band: p.row,
					});
				}
			}
		}
		return { top, bottom };
	}

	/*
	 * The collision obstacle for a tab arc (a <slur>, or a <hammer-on>/<pull-off> drawn as
	 * one): the band it bows into above the fret digits it springs from. Same problem
	 * tieApexRect solves — the arc is a spanner drawn in the finish pass, so there's no glyph
	 * for the above-stave annotations to clear when they're placed here — and the same
	 * answer, reconstructed from the rise TabCurve.draw bows by.
	 *
	 * Only an arc on the top string gets one: TabCurve caps an inner-string arc under the
	 * line above it, where no above-stave text can reach. Returns null when there's no arc.
	 *
	 * ponytail: registered at the notes that carry the slur marker — its two ends — not at
	 * the notes in between, and at the arc's full height whatever it scales down to. Widen
	 * to the drawn span if a chord symbol ever lands mid-arc.
	 */
	private tabArcApexRect(stave: Stave, note: TabNote, lead: Note): Rect | null {
		if (!lead.slurs.length && !lead.hammerOns.length && !lead.pullOffs.length) {
			return null;
		}
		const y = Math.min(...note.getYs());
		if (y - stave.getSpacingBetweenLines() >= stave.getYForLine(0)) {
			return null;
		}
		const hw = this.translator.noteheadHalfWidth();
		return new Rect(
			note.getAbsoluteX() - hw,
			y - TAB_CURVE_RISE,
			2 * hw,
			TAB_CURVE_RISE,
		);
	}

	/*
	 * The collision obstacle for a tab <bend>: the band its arrow and label occupy above the
	 * fret it springs from. Same problem tabArcApexRect solves — a Bend is a note modifier
	 * that vexflow gives no bounding box, so above-stave words placed later see nothing there
	 * and print straight through the arrow. Reconstructed from Bend.draw's own geometry: the
	 * arrow tips out (textLine + 1) stave spaces above the fret, with the "full"/"1/2" label
	 * centered a text height above that. `textLine` is protected — hence the cast, as in
	 * stretchBends, which is also what sets the leg widths this reads.
	 */
	private tabBendRect(stave: Stave, note: TabNote): Rect | null {
		const bend = findModifier<Bend>(note, Bend.CATEGORY);
		if (!bend) {
			return null;
		}
		const { textLine, phrase } = bend as unknown as {
			textLine: number;
			phrase: { drawWidth?: number }[];
		};
		const fretY = Math.min(...note.getYs());
		const top =
			fretY -
			(textLine + 1) * stave.getSpacingBetweenLines() -
			1 -
			bend.getTextHeight();
		const left = note.getAbsoluteX();
		// Mirrors stretchBends' start x, plus the drawn legs, plus the label's overhang past
		// the arrow tip it's centered on.
		const right =
			note.getAbsoluteX() +
			note.getWidth() +
			5 +
			phrase.reduce((sum, leg) => sum + (leg.drawWidth ?? 0), 0) +
			bend.getWidth() / 2;
		return new Rect(left, top, right - left, fretY - top);
	}

	/*
	 * Pull a note's LEADING grace cluster back onto the note when the same note also carries an
	 * after-grace cluster.
	 *
	 * vexflow sizes both clusters together: GraceNoteGroup.format takes the wider one's width
	 * and adds it to the tick context's left shift AND its right shift, so a note with a group
	 * on each side reserves that width twice. Placing a left-side modifier then subtracts the
	 * whole reserved block — left plus right — which slides the leading graces a cluster's width
	 * off the note they lead, leaving them stranded between the two notes. Handing that width
	 * back through the group's own spacing (the one term the left-side placement adds) lands
	 * them against their note again; the after-graces are placed from the note's x and don't
	 * move. Run after the format pass, which is what sets the spacing in the first place.
	 */
	private closeGraceGaps(voices: Voice[]): void {
		for (const voice of voices) {
			for (const note of voice.getTickables()) {
				const groups = note
					.getModifiers()
					.filter(
						(m): m is GraceNoteGroup =>
							m.getCategory() === GraceNoteGroup.CATEGORY,
					);
				if (groups.length < 2) {
					continue;
				}
				const leading = groups.find(
					(g) => g.getPosition() !== Modifier.Position.RIGHT,
				);
				leading?.setSpacingFromNextModifier(
					leading.getSpacingFromNextModifier() +
						note.checkTickContext().getMetrics().modRightPx,
				);
			}
		}
	}

	/*
	 * The highest y a single note reaches: its top notehead, and — when it has a stem —
	 * the stem tip, which a beam extends up to its beam line. Excludes modifiers on
	 * purpose (see formatAndDrawSystem). Falls back to the notehead bound if the stem
	 * extents aren't available (e.g. a stemless whole note).
	 */
	private noteTop(note: StaveNote): number {
		let top = this.noteGlyphTop(note);
		// Clear articulations sitting above the notehead too (e.g. a staccato dot on a
		// stem-down note), and the stacked <technical> marks — a chord's fingering column
		// reaches much further than any single glyph does. They're drawn before the
		// harmony/words/tempo pass, so their bounding box is final; the notehead and stem
		// alone miss them, which would let a chord symbol land on the dot and would crop the
		// page through the top of the column. Only above-side marks raise the top —
		// below-side ones ride the note's own bounding box instead.
		for (const mod of note.getModifiers()) {
			if (mod instanceof TechnicalAnnotation) {
				if (!mod.below) {
					top = Math.min(top, mod.getBoundingBox().getY());
				}
			} else if (
				mod.getCategory() === 'Articulation' &&
				mod.getPosition() === Modifier.Position.ABOVE
			) {
				top = Math.min(top, mod.getBoundingBox().getY());
			}
		}
		return top;
	}

	/*
	 * The top of a note's accidentals, or Infinity when it has none. A flat's ascender climbs
	 * well past the notehead it belongs to, so a volta bracket lifted to clear the noteheads
	 * alone still slices through it.
	 *
	 * Deliberately NOT folded into {@link noteTop}: that also builds the note's collision
	 * obstacle (see noteRect), which is one notehead wide and centered on the notehead — an
	 * accidental sits to its LEFT, so widening the box upward there claims height at an x the
	 * accidental never occupies, and below-stave spanners resolving against it shift for a
	 * glyph that isn't over them.
	 */
	private accidentalTop(note: StaveNote): number {
		let top = Infinity;
		for (const mod of note.getModifiers()) {
			if (mod.getCategory() === 'Accidental') {
				top = Math.min(top, mod.getBoundingBox().getY());
			}
		}
		return top;
	}

	/*
	 * The top of a note's own glyphs — its top notehead, and the stem tip when it has one.
	 * Modifier-free, so it is readable BEFORE the note draws (which {@link noteTop} is not,
	 * since a modifier's bounding box is only final once it's drawn).
	 */
	private noteGlyphTop(note: StaveNote): number {
		let top = note.getNoteHeadBounds().yTop;
		if (note.getStem()) {
			const { topY, baseY } = note.getStemExtents();
			top = Math.min(top, topY, baseY);
		}
		return top;
	}

	/*
	 * The lowest y a single note reaches — the mirror of {@link noteTop}: its bottom
	 * notehead, and the stem tip when it stems down. Modifiers are excluded on purpose,
	 * lyrics included: a lyric's own baseline is what this feeds, so reading it back would
	 * ratchet the row down a little further on every render pass.
	 */
	private noteBottom(note: StaveNote): number {
		let bottom = note.getNoteHeadBounds().yBottom;
		if (note.getStem()) {
			const { topY, baseY } = note.getStemExtents();
			bottom = Math.max(bottom, topY, baseY);
		}
		return bottom;
	}

	/*
	 * Stack each note's <technical> marks (fingering/pluck labels, string-number rings) into
	 * a column running away from the stave, and register each one as a collision obstacle so
	 * the above-stave text placed later lifts clear of it.
	 *
	 * The column starts past whichever is further out — the stave's near line or the note's
	 * own glyphs — so a chord on ledger lines pushes its digits out with it instead of
	 * printing them over its own noteheads. Each mark then steps one of its own row heights
	 * further out, which is the part vexflow's Annotation stacking gets wrong (see
	 * TechnicalAnnotation): it hands every mark on a note low in the stave the same row.
	 *
	 * Called after format and before draw, like pinLyrics — the notes' x/y are final by then
	 * but nothing has rendered, so the marks' own bounding boxes aren't readable yet and the
	 * column is measured off the note's glyphs alone (noteGlyphTop/noteBottom).
	 */
	private pinTechnicals(p: PendingStave): void {
		for (const note of p.staveNotes) {
			const marks = note
				.getModifiers()
				.filter(
					(m): m is TechnicalAnnotation => m instanceof TechnicalAnnotation,
				);
			if (marks.length === 0) {
				continue;
			}
			// The stave reaches the notes via Voice.draw, which hasn't run yet.
			note.setStave(p.stave);
			const sides = [
				{
					below: false,
					edge:
						Math.min(p.stave.getYForLine(0), this.noteGlyphTop(note)) -
						TECHNICAL_EDGE_GAP,
				},
				{
					below: true,
					edge:
						Math.max(p.stave.getBottomLineY(), this.noteBottom(note)) +
						TECHNICAL_EDGE_GAP,
				},
			];
			for (const { below, edge } of sides) {
				let y = edge;
				for (const mark of marks.filter((m) => m.below === below)) {
					const height = mark.rowHeight();
					// A row's baseline is its bottom edge, so a column growing DOWN steps
					// before placing the mark and one growing UP steps after.
					if (below) {
						y += height;
					}
					mark.setBaselineY(y);
					// Pin the ink the same way pinLyrics does — a mark drawn inside a colored
					// notehead's style would otherwise take that notehead's color.
					mark.setStyle({ fillStyle: this.notationColor });
					const w = mark.getWidth();
					this.collisionResolver.add({
						rect: new Rect(note.getAbsoluteX() - w / 2, y - height, w, height),
						kind: 'annotation',
						band: p.row,
					});
					if (!below) {
						y -= height;
					}
				}
			}
		}
	}

	/*
	 * Put every lyric syllable on one stave onto the shared baseline `lyricBaselines`
	 * measured for its row, one line per verse. Left to vexflow each syllable would hang off
	 * its own note (see LyricAnnotation), so the verse would rise and fall with the melody
	 * instead of reading as a line of text. Called after format and before draw, so the
	 * syllables land under where the notes actually ended up.
	 *
	 * Each pinned syllable is also registered as a collision obstacle, so anything the draw
	 * pass places under the stave later (a placement="below" directive, a dynamics marking)
	 * drops clear of the verse instead of printing through it. vexflow draws lyrics itself,
	 * so this is the only point where their boxes are known.
	 */
	/** Key for one stave row of one system, the scope a verse's baseline is shared over. */
	private lyricRowKey(row: number): string {
		return `${this.systemIndex}:${row}`;
	}

	/*
	 * Remember how far this measure column pushed its verse below the staff, and whether any
	 * other column of the same row wanted a different drop. The max is what the next pass
	 * pins every column of the row to; `lyricsStepped` is what tells the driver a second pass
	 * is worth running (a row whose columns already agree redraws to the same pixels).
	 */
	private recordLyricDrop(row: number, drop: number): void {
		const key = this.lyricRowKey(row);
		const seen = this.observedLyricDrops.get(key);
		if (seen !== undefined && seen !== drop) {
			this.lyricsStepped = true;
		}
		this.observedLyricDrops.set(key, Math.max(seen ?? 0, drop));
	}

	private pinLyrics(p: PendingStave, baseline: number): void {
		const lyricsOf = (note: StaveNote) =>
			note
				.getModifiers()
				.filter((m): m is LyricAnnotation => m instanceof LyricAnnotation);
		const lyricNotes = p.staveNotes
			.map((note) => ({ note, lyrics: lyricsOf(note) }))
			.filter(({ lyrics }) => lyrics.length > 0);
		if (lyricNotes.length === 0) {
			return;
		}
		for (const { note, lyrics } of lyricNotes) {
			for (const lyric of lyrics) {
				const y = baseline + lyric.verseIndex * LYRIC_LINE_HEIGHT;
				lyric.setBaselineY(y);
				// Pin the ink a syllable already draws in. vexflow runs a note's modifiers
				// inside its notehead's own style, so an uncolored lyric under a note the
				// score colored would otherwise come out in the notehead's color.
				lyric.setStyle({ fillStyle: this.notationColor });
				// LyricAnnotation.draw centers the syllable on the notehead and draws up from
				// the baseline, so its box is one text height tall ending at that baseline.
				const w = lyric.getWidth();
				this.collisionResolver.add({
					rect: new Rect(
						note.getAbsoluteX() - w / 2,
						y - LYRIC_FONT_SIZE,
						w,
						LYRIC_FONT_SIZE,
					),
					kind: 'annotation',
					band: p.row,
				});
			}
		}
		this.drawMelismas(p, baseline, lyricsOf);
	}

	/*
	 * Melisma extenders: a `<lyric><extend/>` draws a horizontal line on the verse's own row
	 * from just past its syllable to the last note the syllable is held over — the note before
	 * the next syllable in that same verse, or the stave's last note when none follows. Drawn
	 * here rather than as a modifier because the line spans notes, and pinLyrics is the point
	 * where every syllable's row and every note's x are final.
	 *
	 * ponytail: the line stops at the end of the stave, so a melisma that runs past a barline
	 * or a system break draws only its first segment. Make it a real spanner (buildTies'
	 * pairing in spanner-builder.ts is the model) if a fixture needs the continuation.
	 */
	private drawMelismas(
		p: PendingStave,
		baseline: number,
		lyricsOf: (note: StaveNote) => LyricAnnotation[],
	): void {
		const notes = p.staveNotes;
		for (const [i, note] of notes.entries()) {
			for (const lyric of lyricsOf(note)) {
				if (!lyric.extend) {
					continue;
				}
				const next = notes.findIndex(
					(n, j) =>
						j > i && lyricsOf(n).some((l) => l.verseIndex === lyric.verseIndex),
				);
				const last = notes[(next === -1 ? notes.length : next) - 1];
				if (!last || last === note) {
					continue;
				}
				const y = baseline + lyric.verseIndex * LYRIC_LINE_HEIGHT;
				const x1 = note.getAbsoluteX() + lyric.getWidth() / 2;
				const x2 = last.getAbsoluteX() + this.translator.noteheadHalfWidth();
				if (x2 <= x1) {
					continue;
				}
				this.context.save();
				this.context.setStrokeStyle(this.notationColor);
				this.context.setLineWidth(1);
				// Half-pixel offset so a 1px line lands on one device row instead of straddling
				// two and coming out gray next to the black staff lines.
				const crisp = Math.round(y) + 0.5;
				this.context.beginPath();
				this.context.moveTo(x1, crisp);
				this.context.lineTo(x2, crisp);
				this.context.stroke();
				this.context.restore();
				this.collisionResolver.add({
					rect: new Rect(x1, y - 1, x2 - x1, 2),
					kind: 'annotation',
					band: p.row,
				});
			}
		}
	}

	/*
	 * The collision obstacle for a note: a box from its top (noteTop — notehead ∪ beam-extended
	 * stem tip ∪ above articulations) down to its bottom (noteBottom — the mirror), one notehead
	 * wide, centered on its laid-out x. Deliberately built from noteTop/noteBottom, NOT
	 * note.getBoundingBox() (which unions attached modifiers and reports a bogus near-origin y
	 * for grace groups).
	 *
	 * The bottom edge reaches the stem tip, not just the lowest notehead, so a stem-down beam is
	 * an obstacle to the things that stack UNDER a stave — an ottava bracket, a pedal, a
	 * below-stave words direction all sat in the band a low beam reaches into.
	 */
	private noteRect(note: StaveNote): Rect {
		const top = this.noteTop(note);
		const bottom = this.noteBottom(note);
		const hw = this.translator.noteheadHalfWidth();
		return new Rect(note.getAbsoluteX() - hw, top, 2 * hw, bottom - top);
	}

	/*
	 * The collision obstacle for a stem-down note's tie: the band the tie ribbon bows up into,
	 * from its reconstructed apex (TIE_APEX_RISE above the top notehead) down to that notehead.
	 * The tie is a separate spanner drawn later, so there's no glyph to measure — this lets an
	 * annotation clear the arc the same way it clears a notehead.
	 */
	private tieApexRect(note: StaveNote): Rect {
		const headTop = Math.min(...note.getYs());
		const hw = this.translator.noteheadHalfWidth();
		return new Rect(
			note.getAbsoluteX() - hw,
			headTop - TIE_APEX_RISE,
			2 * hw,
			TIE_APEX_RISE,
		);
	}

	/*
	 * VexFlow draws a bend arrow at a fixed ~8px width. A guitar bend reads as sliding
	 * into the next note, so stretch each so its arrow reaches the next note — or the
	 * bar's end if it's the last note (same span as stretchVibratos). The arrow draws
	 * from getAbsoluteX() + width + 2 + 3 (TabNote RIGHT modifier x, +3 in Bend.draw),
	 * mirrored here (the modifier's own x isn't positioned until draw). getAbsoluteX()
	 * is in stave coordinates only because formatAndDrawSystem setStave's the notes first — else
	 * it's stave-relative and the last note's span to getNoteEndX overshoots off the page.
	 * Bend.draw uses each phrase leg's drawWidth, which is protected — hence the cast. A
	 * bend-and-release (UP+DOWN) peaks at the midpoint and returns, so split across legs.
	 */
	private stretchBends(stave: TabStave, voices: Voice[]): void {
		for (const voice of voices) {
			const tickables = voice.getTickables() as TabNote[];
			tickables.forEach((note, i) => {
				const bend = findModifier<Bend>(note, Bend.CATEGORY);
				if (!bend) {
					return;
				}
				const startX = note.getAbsoluteX() + note.getWidth() + 5;
				const endX = tickables[i + 1]?.getAbsoluteX() ?? stave.getNoteEndX();
				const width = Math.max(0, endX - startX);
				const { phrase } = bend as unknown as {
					phrase: { drawWidth?: number }[];
				};
				const [up, down] = phrase;
				if (!up) {
					return;
				}
				if (down) {
					up.drawWidth = width / 2;
					down.drawWidth = 0;
				} else {
					up.drawWidth = width;
				}
			});
		}
	}

	/*
	 * VexFlow's Vibrato draws a fixed 20px wavy line trailing the fret. A real vibrato
	 * sustains for the note's full sounding length, so stretch each to span up to the
	 * next note — or the bar's end if it's the last note. Widths depend on the formatted
	 * x positions, so this runs after formatToStave: set each Vibrato's width from the
	 * fret's right edge to the next note's x (or the stave's note-end x). The Vibrato
	 * draws from getAbsoluteX() + width + 2 (TabNote.getModifierStartXY for RIGHT), mirrored
	 * here. Like stretchBends, this relies on formatAndDrawSystem having setStave'd the notes so
	 * getAbsoluteX() is in stave coordinates and the last note's span clamps to the barline.
	 */
	private stretchVibratos(stave: TabStave, voices: Voice[]): void {
		for (const voice of voices) {
			const tickables = voice.getTickables() as TabNote[];
			tickables.forEach((note, i) => {
				const vibrato = findModifier<Vibrato>(note, Vibrato.CATEGORY);
				if (!vibrato) {
					return;
				}
				const startX = note.getAbsoluteX() + note.getWidth() + 2;
				const endX = tickables[i + 1]?.getAbsoluteX() ?? stave.getNoteEndX();
				vibrato.setVibratoWidth(Math.max(0, endX - startX));
			});
		}
	}

	/*
	 * A tab grace group reserves no accidental space, so its frets would land left of the
	 * notation grace noteheads, which a flat/sharp pushes right within their own group. Shift
	 * each tab grace group right so its frets sit under the notehead: by the notation grace
	 * group's own left reservation (its width + GRACE_GROUP_SPACING_STAVE) minus the tab
	 * group's (note.getMetrics().modLeftPx). Match the notation group by the shared tick
	 * context — every stave formatted together shares one per tick. Deliberately NOT the tick
	 * context's modLeftPx: that's the max across the stave, so a main note with its OWN
	 * accidental (a chord) inflates it and overshoots the grace shift. With no notation
	 * counterpart (tab-only score) nothing moves. Runs before draw, which reads
	 * spacingFromNextModifier when positioning the grace notes.
	 */
	private alignTabGraces(
		voices: Voice[],
		notationGraceWidths: Map<unknown, number>,
	): void {
		for (const voice of voices) {
			for (const note of voice.getTickables() as TabNote[]) {
				const group = graceGroupOf(note);
				if (!group) {
					continue;
				}
				const notationWidth = notationGraceWidths.get(note.getTickContext());
				if (notationWidth === undefined) {
					continue;
				}
				const own = note.getMetrics().modLeftPx;
				group.setSpacingFromNextModifier(
					group.getSpacingFromNextModifier() +
						Math.max(0, notationWidth + GRACE_GROUP_SPACING_STAVE - own),
				);
			}
		}
	}

	/*
	 * The "TAB" glyph is sized and centered for a 6-line staff. For a shorter tab staff
	 * (e.g. a 4-string bass) shrink and re-center it to fit. Reaches into vexflow's clef
	 * modifier directly — there's no public API for this.
	 */
	private resizeTabClef(stave: TabStave, tabLines: number): void {
		if (tabLines === 6) {
			return;
		}
		const [tabClef] = stave.getModifiers(
			undefined,
			'Clef',
		) as unknown as Array<{
			line: number;
			fontInfo: { size: number };
		}>;
		if (tabClef) {
			tabClef.fontInfo.size *= (tabLines - 1) / 5;
			tabClef.line = (tabLines - 1) / 2;
		}
	}

	/*
	 * Collect hit-index boxes now that this measure's notes are formatted (positions
	 * final). Each notehead/fret maps back to its mdom note; measure boxes back each
	 * measure's staff column. Still scratch space — shifted to score space by the caller.
	 */
	private collectGeometry(m: number, contentTop: number): void {
		for (const p of this.systemPending) {
			if (p.isTab) {
				const tabStave = p.stave as TabStave;
				// Graces ride along here too (same fret capture), so a tab grace colors in step
				// with its notation grace; they stay out of the pointer tree (hit.ts skips them).
				for (const { note, chord } of [...p.tabChords, ...p.graceTabChords]) {
					const x = note.getAbsoluteX();
					// The drawn fret glyphs, parallel to getPositions() (one per struck string), so a
					// decoration can replay the exact fret text vexflow drew — "<12>", "(2)", "✕" —
					// in color. The tab analog of the notation path's note.noteHeads.
					const positions = note.getPositions();
					const fretEls = (
						note as unknown as {
							fretElement: {
								getText(): string;
								getFont(): string;
								getWidth(): number;
								getYShift(): number;
							}[];
						}
					).fretElement;
					for (const mnote of chord.notes) {
						const string = mnote.string;
						const fret = mnote.fret;
						if (string === null || fret === null) {
							continue;
						}
						const y = tabStave.getYForLine(string - 1);
						// Match this string's drawn fret glyph (positions carry one entry per string).
						const el =
							fretEls[positions.findIndex((pos) => pos.str === string)];
						this.rawNotes.push({
							mnote,
							rect: new Rect(
								x - FRET_HALF_W,
								y - FRET_HALF_H,
								2 * FRET_HALF_W,
								2 * FRET_HALF_H,
							),
							chord: chord.notes,
							measureIndex: m,
							tab: { string, fret },
							// Replay vexflow's own fret glyph for recoloring, the tab analog of the
							// notehead path: its left-anchored baseline x (drawPositions uses
							// tabX = absoluteX - width/2) and baseline y (the string line plus the
							// element's yShift, which is how TabNote vertically centers the digit).
							// Drawn left/alphabetic, a colored fret overlays the engraved one exactly.
							glyph: el
								? {
										text: el.getText(),
										font: el.getFont(),
										x: x - el.getWidth() / 2,
										y: y + el.getYShift(),
									}
								: null,
						});
					}
				}
			} else {
				// Graces ride along: same notehead capture, so playback can sound and color
				// them. They land in the hit index but not the pointer tree (hit.ts skips them).
				for (const { note, chord } of [...p.noteChords, ...p.graceChords]) {
					// The notehead glyph's true x-span (getAbsoluteX is the tick anchor, left of
					// the notehead — centering on it puts decorations off the note). y per
					// notehead comes from getYs; noteHeads is indexed in the same (chord.notes)
					// order, so heads[i] is this note's glyph.
					const headX = note.getNoteHeadBeginX();
					const headWidth = note.getNoteHeadEndX() - headX;
					const ys = note.getYs();
					const heads = note.noteHeads;
					chord.notes.forEach((mnote, i) => {
						const y = ys[i];
						if (y === undefined) {
							return;
						}
						// Capture the exact stamp vexflow drew (text + font + baseline) so a
						// decoration can replay it in color — see Decorations. Scratch space; the
						// caller shifts y by cropTop into score space alongside the rect. Read x
						// from the bounding box (this.x + xShift), not getX(): a NoteHead borrows
						// its StaveNote's tick context, so the inherited Tickable.getX() throws.
						// The baseline y is the notehead's staff y (ys[i]); noteheads carry no yShift.
						const head = heads[i];
						const glyph = head
							? {
									text: head.getText(),
									font: head.getFont(),
									x: head.getBoundingBox().getX(),
									y,
								}
							: null;
						this.rawNotes.push({
							mnote,
							rect: new Rect(
								headX,
								y - NOTEHEAD_HALF_H,
								headWidth,
								2 * NOTEHEAD_HALF_H,
							),
							chord: chord.notes,
							measureIndex: m,
							tab: null,
							glyph,
						});
					});
				}
			}
		}
		if (this.systemTop && this.systemBottom) {
			// The box spans the staff column, then grows to enclose whatever escapes it: notes
			// that rise above the top staff line (contentTop) and, at a system start, the stave
			// connector, which draws left of the staves and (for a bracket) overhangs them top
			// and bottom. Otherwise a high note or the bracket clips out of the measure's box —
			// and the playback cursor that rides it. contentTop is Infinity when the measure has
			// no notes, so it never shrinks the box.
			const connector = this.connectorExtent();
			const left = Math.min(this.measureX, connector?.left ?? Infinity);
			const right = this.measureX + this.measureWidth;
			const top = Math.min(
				this.systemY,
				contentTop,
				connector?.top ?? Infinity,
			);
			const bottom = Math.max(
				this.systemContentBottom,
				connector?.bottom ?? -Infinity,
			);
			this.rawMeasures.push({
				rect: new Rect(left, top, right - left, Math.max(0, bottom - top)),
				index: m,
				number: this.parts[0]?.measures[m]?.number ?? String(m + 1),
				systemIndex: this.systemIndex,
			});
		}
	}

	/*
	 * The extent of the stave connector drawn at a system start (a bracket or brace joining a
	 * part's staves, or a notation+tab pair across parts), so the system-start measure box can
	 * grow to contain it. vexflow draws a bracket just left of the stave (BRACKET_X_SHIFT),
	 * insetting its bar/curl glyphs a little further and overhanging the curls past the top and
	 * bottom staff lines; a brace reaches further left but stays within the staff lines
	 * vertically. Returns null away from a system start, or when the only connector is the plain
	 * left line (which sits on measureX — already the box's left edge).
	 */
	private connectorExtent(): {
		left: number;
		top: number;
		bottom: number;
	} | null {
		if (!this.isSystemStart || !this.systemTop || !this.systemBottom) {
			return null;
		}
		let bracket = partsPairTabWithNotation(
			this.parts,
			this.showTabs,
			this.showNotation,
		);
		let brace = false;
		for (const part of this.parts) {
			if (
				visibleStaffNumbers(part, {
					showTabs: this.showTabs,
					showNotation: this.showNotation,
				}).length <= 1
			) {
				continue;
			}
			const symbol = partSymbol(part, {
				showTabs: this.showTabs,
				showNotation: this.showNotation,
			});
			bracket ||= symbol === 'bracket';
			brace ||= symbol === 'brace';
		}
		const top = this.systemTop.getYForLine(0);
		const bottom = this.systemBottom.getBottomLineY();
		if (bracket) {
			return {
				left: this.measureX - BRACKET_X_SHIFT - BRACKET_GLYPH_OVERHANG,
				top: top - CONNECTOR_VERTICAL_OVERHANG,
				bottom: bottom + CONNECTOR_VERTICAL_OVERHANG,
			};
		}
		if (brace) {
			return { left: this.measureX - BRACE_LEFT_OVERHANG, top, bottom };
		}
		return null;
	}

	/*
	 * Draw the above-stave annotations queued for this measure, after the system is
	 * formatted so every anchor x is real: words, then chord symbols/diagrams, then
	 * tempo marks.
	 */
	private drawAnnotations(m: number): void {
		// Words go before the diagrams so a chord diagram draws on top of any words it
		// shares a measure with — the fret box stays fully legible, the text yields.
		for (const w of this.wordsTasks) {
			// A tab fret glyph is drawn CENTERED on its column x, but a notation notehead is
			// drawn FROM it — so text left-anchored at that x starts at the fret's middle and
			// reads as shifted right of the fret AND of the notehead above it. Center it over a
			// tab anchor so it lines up with both. On a notation stave, left-anchored at the
			// notehead is already right (and is what MuseScore draws), so leave that alone.
			const placed = this.drawWords(
				w.stave,
				w.text,
				w.anchor,
				w.placement,
				w.anchor instanceof TabNote
					? {
							font: this.labelFont,
							size: WORDS_FONT_SIZE,
							italic: true,
							align: 'center',
						}
					: undefined,
			);
			// A below-stave directive grows the crop downward instead (drawWords already
			// reported the drop); only above-stave text lifts the measure box's top.
			if (w.placement !== 'below') {
				this.pageTop = Math.min(this.pageTop, placed.y);
				this.growDecorationTop(this.systemIndex, placed.y);
			}
		}
		// Dynamics ride the same path as words — they're just typed in the music font. A
		// marking spelled out of SMuFL's dynamic letters engraves as glyphs; an
		// <other-dynamics> keeps its literal text in the words face.
		for (const d of this.dynamicsTasks) {
			const placed = this.drawWords(
				d.stave,
				d.glyph ? dynamicGlyphs(d.text) : d.text,
				d.anchor,
				d.placement,
				d.glyph
					? {
							font: this.notationFont,
							size: DYNAMICS_FONT_SIZE,
							italic: false,
							color: this.notationColor,
							align: 'center',
						}
					: {
							font: this.labelFont,
							size: WORDS_FONT_SIZE,
							italic: true,
							align: 'center',
						},
			);
			if (d.placement !== 'below') {
				this.pageTop = Math.min(this.pageTop, placed.y);
				this.growDecorationTop(this.systemIndex, placed.y);
			}
		}
		// Figured bass: one row per <figure> under the stave, top figure first. Each row goes
		// through the same below-stave path as a dynamic, so the collision resolver drops each
		// one clear of the row already placed above it and the stack builds downward on its
		// own — no per-row offset arithmetic. Upright rather than italic: the numerals are read
		// as figures, not as an expression marking.
		for (const f of this.figuredBassTasks) {
			for (const figure of f.figures) {
				this.drawWords(f.stave, figure, f.anchor, 'below', {
					font: this.labelFont,
					size: WORDS_FONT_SIZE,
					italic: false,
					align: 'center',
				});
			}
		}
		// Diagrams sit at their lead note's x; two on notes either side of a barline can be
		// close enough to overlap (especially at a narrow width). The resolver pushes each
		// box clear of any already-placed diagram in its band (replacing the old running
		// cursor) so crowded diagrams separate instead of stacking. It also lifts each box
		// above any notes, ties, or words in its column (the diagrams pass runs after the
		// notes and words), so a high note or a word like "(as taught)" stays put and the
		// box rises over it.
		for (const h of this.harmonyTasks) {
			// A <harmony> with a <frame> draws as a fret box (chord name as its title)
			// above the stave; one without draws as the plain chord-symbol text.
			const stave = h.frame ? h.staveNote.getStave() : null;
			if (h.frame && stave) {
				const top =
					stave.getYForLine(0) - CHORD_DIAGRAM_GAP - CHORD_DIAGRAM_HEIGHT;
				// Size to the frame: one column per string, enough fret rows to hold the
				// deepest dot/barre (min 4 so a sparse chord still looks like a fretboard).
				const frets = [
					...h.frame.chord.map(([, f]) => (typeof f === 'number' ? f : 0)),
					...(h.frame.barres ?? []).map((b) => b.fret),
				];
				const natural = new Rect(
					h.staveNote.getAbsoluteX(),
					top,
					CHORD_DIAGRAM_WIDTH,
					CHORD_DIAGRAM_HEIGHT,
				);
				const band = this.rowOf(stave);
				// Lift, THEN space — not the other way round. A diagram over a run of high
				// notes rises a long way off its default row, so the boxes already placed in
				// this system sit well above where an unlifted box would probe: pushRightOf
				// there matches nothing and two crowded diagrams print through each other.
				// Lifting first puts the box in the row its neighbours are actually in.
				//
				// Padded below its bottom so the lift-clear probe reaches a high note (or its
				// tie) poking up into the box's column — the same padding treatment a chord
				// symbol uses. The box then rises off the note instead of overlapping it; with
				// nothing in the way it keeps its default position. Banded to its own stave
				// row: without it, a lower part's diagram sees the part above's notes and
				// lyrics in the same column and climbs over the whole part, stranding the box
				// above music it doesn't label.
				const lift = (box: Rect) =>
					this.collisionResolver.liftClear(
						new Rect(
							box.x,
							box.y,
							box.w,
							CHORD_DIAGRAM_HEIGHT + CHORD_DIAGRAM_PADDING,
						),
						CHORD_DIAGRAM_GAP,
						{ kinds: TEXT_CLEAR_KINDS, band },
					);
				// Recover the real (unpadded) box; the padding only extended the probe.
				const unpad = (box: Rect) =>
					new Rect(box.x, box.y, CHORD_DIAGRAM_WIDTH, CHORD_DIAGRAM_HEIGHT);
				const lifted = unpad(lift(natural));
				const spaced = this.collisionResolver.pushRightOf(
					lifted,
					'diagram',
					CHORD_DIAGRAM_GAP,
				);
				// Spacing moved it into a different column, which may hold taller notes than
				// the one it was lifted out of — so lift again where it actually landed.
				const unclamped = spaced.x === lifted.x ? lifted : unpad(lift(spaced));
				// A box anchored at a note near the right edge would overrun the canvas and be
				// clipped (page overflow has no crop-growth knob like the vertical edges do), so
				// nudge it back inside the drawable region.
				const placed = this.collisionResolver.nudgeInsideX(
					unclamped,
					this.scratchViewport,
					PAGE_MARGIN_X,
				);
				this.collisionResolver.add({
					rect: placed,
					kind: 'diagram',
					band: this.rowOf(stave),
				});
				const diagram = new ChordDiagramGlyph(placed.x, placed.y, {
					...h.frame,
					title: h.text || undefined,
					width: CHORD_DIAGRAM_WIDTH,
					height: CHORD_DIAGRAM_HEIGHT,
					stringCount: h.frame.chord.length,
					fretCount: Math.max(4, ...frets),
					showTuning: false,
					fontFamily: this.labelFont,
					// ponytail: only the ink follows the engraving color; the open-string bgColor
					// stays white. Thread backgroundColor through if a dark theme needs it too.
					color: this.notationColor,
				});
				diagram.draw(this.context);
				this.pageTop = Math.min(this.pageTop, diagram.top);
				// Report the box (title included) so pass two opens the gap to the stave above
				// wide enough to hold it. Without this a lower part's diagram has nowhere to go
				// and lands on the part above's lyrics.
				this.recordAnnotationSpill(
					stave,
					new Rect(
						placed.x,
						diagram.top,
						placed.w,
						placed.bottom - diagram.top,
					),
				);
				// Unlike words/chord symbols, a chord diagram is NOT folded into the measure
				// box (no growDecorationTop): the diagram is a tall floating fret box, and a
				// playback cursor bar stretching all the way up to it reads as disconnected.
				// The bar should span only the stave region — as if the diagram weren't there.
				// The diagram is still kept on-canvas (pageTop) and reserved against the system
				// above (systemHighestTop); it just doesn't lift the cursor/measure box.
				// The diagram rises above the stave, so it also counts toward this system's
				// upward overflow — otherwise no systemSpacing is reserved for it and a
				// diagram on a stacked system collides with the system above.
				this.systemHighestTop.set(
					this.systemIndex,
					Math.min(
						this.systemHighestTop.get(this.systemIndex) ?? Infinity,
						diagram.top,
					),
				);
				// Emit the placed box for the element index (the whole drawn extent, title
				// included), still in scratch space — the caller shifts it with the crop.
				this.rawChordDiagrams.push({
					rect: new Rect(
						placed.x,
						diagram.top,
						placed.w,
						placed.bottom - diagram.top,
					),
					harmonySource: h.source,
					measureIndex: m,
					frame: h.frame,
					title: h.text || null,
				});
			} else {
				const top = this.drawHarmony(h.staveNote, h.text);
				this.pageTop = Math.min(this.pageTop, top);
				this.growDecorationTop(this.systemIndex, top);
			}
		}
		// The tempo mark goes last so it stacks on top of anything else above the stave. A
		// chord symbol and a metronome mark in the same measure both anchor at the first
		// note, so they land in the same spot; engraving convention (and MuseScore) puts the
		// symbol nearest the staff and the tempo above it, which is what drawing last gives.
		for (const t of this.tempoTasks) {
			const top = this.drawTempo(t.stave, t);
			this.pageTop = Math.min(this.pageTop, top);
			this.growDecorationTop(this.systemIndex, top);
		}
		// A rehearsal mark belongs to the measure, not to one part — every part carries the
		// same one — so it's read from the first part (like the barline decorations) and
		// printed once, over the column's top stave. It goes last of all: engraving puts the
		// section header at the very top of the above-stave stack, clear of tempo and chords.
		const topStave = this.systemTop;
		const measure = this.parts[0]?.measures[m];
		// Segno/coda: measure-level landmarks like a rehearsal mark, so they're read from the
		// first part and printed once over the column's top stave, at its left edge — where a
		// player scanning for "the sign" looks. Drawn before the rehearsal marks so a mark in
		// the same measure stacks above rather than over them.
		if (topStave && measure) {
			for (const kind of this.reader.navigationsOf(measure)) {
				const placed = this.drawWords(
					topStave,
					NAVIGATION_GLYPHS[kind],
					topStave.getX(),
					'above',
					{
						font: this.notationFont,
						size: NAVIGATION_FONT_SIZE,
						italic: false,
						color: this.notationColor,
					},
				);
				this.pageTop = Math.min(this.pageTop, placed.y);
				this.growDecorationTop(this.systemIndex, placed.y);
			}
		}
		// "Nx" over a repeat played more than twice: like the rehearsal mark it belongs to the
		// measure rather than to a part, so it prints once over the column's top stave.
		// Right-aligned on the closing barline, which is the sign it qualifies.
		const timesLabel = this.decorations[m]?.repeatTimesLabel;
		if (topStave && timesLabel) {
			const placed = this.drawWords(
				topStave,
				timesLabel,
				topStave.getX() + topStave.getWidth(),
				'above',
				{
					font: this.labelFont,
					size: WORDS_FONT_SIZE,
					italic: false,
					align: 'right',
				},
			);
			this.pageTop = Math.min(this.pageTop, placed.y);
			this.growDecorationTop(this.systemIndex, placed.y);
		}
		if (topStave && measure) {
			for (const text of this.reader.rehearsalsOf(measure)) {
				const top = this.drawRehearsal(topStave, text);
				this.pageTop = Math.min(this.pageTop, top);
				this.growDecorationTop(this.systemIndex, top);
			}
		}
	}

	/*
	 * Draw a rehearsal mark (a section header like "A" or "Chorus") as boxed bold text above
	 * the stave, anchored at the measure's left edge — a player reading "from B" looks for
	 * the barline, not a note. The collision resolver lifts it clear of anything already in
	 * its column. Returns the y the box reaches up to so the caller can grow the page crop.
	 */
	private drawRehearsal(stave: Stave, text: string): number {
		this.context.save();
		this.context.setFont(this.labelFont, REHEARSAL_FONT_SIZE, 'bold');
		this.context.setFillStyle(this.textColor);
		this.context.setStrokeStyle(this.textColor);
		const w = this.context.measureText(text).width + 2 * REHEARSAL_PADDING;
		const h = REHEARSAL_FONT_SIZE + 2 * REHEARSAL_PADDING;
		const bottom = stave.getYForLine(0) - REHEARSAL_Y_OFFSET;
		const natural = new Rect(stave.getX(), bottom - h, w, h);
		const band = this.rowOf(stave);
		const placed = this.collisionResolver.liftClear(
			natural,
			REHEARSAL_NOTE_CLEARANCE,
			{ kinds: TEXT_CLEAR_KINDS, band },
		);
		this.recordAnnotationSpill(stave, placed);
		this.context.setLineWidth(1);
		this.context.beginPath();
		this.context.moveTo(placed.x, placed.y);
		this.context.lineTo(placed.right, placed.y);
		this.context.lineTo(placed.right, placed.bottom);
		this.context.lineTo(placed.x, placed.bottom);
		this.context.closePath();
		this.context.stroke();
		this.context.fillText(
			text,
			placed.x + REHEARSAL_PADDING,
			placed.bottom - REHEARSAL_PADDING,
		);
		this.context.restore();
		this.collisionResolver.add({ rect: placed, kind: 'annotation', band });
		return placed.y;
	}

	/*
	 * The collision box of a metronome mark drawn at (`x`, `baseline`): StaveTempo lays the
	 * beat-unit glyph, "=", and the bpm out on one baseline with 3px gaps, all shrunk by
	 * TEMPO_SCALE. Measured with the same vexflow Elements (and Metrics font info) StaveTempo
	 * draws with, so the box matches the drawn glyphs — ink ascent AND descent, because the
	 * beat-unit glyph's origin is its notehead center, so half of it hangs below the baseline.
	 * ponytail: measured with the quarter-note glyph whatever the beat unit — the note glyphs
	 * are within a couple of pixels of each other at this size, except a stemless whole note,
	 * which just reserves a little more air than it needs.
	 */
	private tempoLayout(
		task: TempoTask,
		x: number,
		baseline: number,
	): { rect: Rect; markWidth: number } {
		const tempo = task.tempo;
		//  is SMuFL metNoteQuarterUp; vexflow's Glyphs enum isn't re-exported.
		const glyph = new Element('StaveTempo.glyph').setText('');
		//  is metAugmentationDot, the dot StaveTempo trails a dotted beat unit with.
		const dot = new Element('StaveTempo.glyph').setText('');
		const text = new Element('StaveTempo');
		const ink = glyph.getTextMetrics();
		let w = 0;
		let ascent = ink.actualBoundingBoxAscent;
		let descent = ink.actualBoundingBoxDescent;
		if (tempo) {
			// Walk the same pieces StaveTempo.draw lays down, each advancing by its own width
			// plus a 3px gap: an opening paren, the beat unit and its dots, "=", then either a
			// second dotted unit (the metric-modulation form) or the bpm, then a closing paren.
			const advance = (el: Element) => el.getWidth() + 3;
			w += tempo.parenthesis ? advance(text.setText('(')) : 0;
			w += advance(glyph) + (tempo.dots ?? 0) * advance(dot);
			w += advance(text.setText('='));
			w += tempo.duration2
				? advance(glyph) + (tempo.dots2 ?? 0) * advance(dot)
				: advance(text.setText(String(tempo.bpm)));
			if (tempo.parenthesis) {
				w += text.setText(')').getWidth();
			}
		}
		// How far the bpm mark alone reaches, which is where the note-group mark starts.
		const markWidth = w;
		if (task.modulation) {
			// The note-group mark follows the bpm one along the same baseline, so the box is the
			// union of the two: widths add, and a tuplet bracket reaches higher than a beat unit.
			const group = new MetronomeGlyph(task.modulation);
			w += (tempo ? TEMPO_MARK_GAP : 0) + group.width;
			ascent = Math.max(ascent, group.ascent);
			descent = Math.max(descent, group.descent);
		}
		return {
			rect: new Rect(
				x,
				baseline - ascent * TEMPO_SCALE,
				w * TEMPO_SCALE,
				(ascent + descent) * TEMPO_SCALE,
			),
			markWidth: markWidth + (tempo ? TEMPO_MARK_GAP : 0),
		};
	}

	/*
	 * Draw a metronome mark ("<note> = bpm") above the stave, anchored just right of the
	 * clef/key/time (StaveTempo's own placement, over the first note). It normally sits one
	 * text line above the staff; the collision resolver lifts it clear of anything already in
	 * its column — a high note reaching up into that band, or a chord symbol/word placed
	 * earlier in this pass — and the layout reserves the matching top headroom. Returns the y
	 * the mark reaches up to so the caller can grow the page crop above it. Drawn after the
	 * notes are formatted so the anchor x and the note extents are real.
	 */
	private drawTempo(stave: Stave, task: TempoTask): number {
		const baseY = stave.getYForTopText(1);
		// vexflow's StaveTempo.draw reads stave.getModifierXShift(position), which uses the
		// position enum as an index into the stave's modifier array. ABOVE (the default, 3)
		// indexes modifiers[3], which is undefined — and throws — on a system-start stave that
		// re-states a clef but no time signature (begin barline + clef + end barline = 3
		// modifiers). CENTER (0) points at the always-present begin barline instead, yielding
		// the same start-of-notes x offset without the out-of-bounds read.
		const position = 0;
		const shiftX = stave.getModifierXShift(position);
		// StaveTempo's font sizes come from vexflow Metrics, which isn't reachable to override,
		// so shrink the whole mark with a context scale. Scaling multiplies every coordinate by
		// TEMPO_SCALE, which would also drag the mark up and left; pre-divide the x/y inputs so it
		// lands back on its original anchor. Internally StaveTempo draws at (this.x + shiftX + 10,
		// baseY + this.yShift); solving s·(passed) = target gives the compensated inputs below.
		const targetX = stave.getX() + shiftX + 10;
		const band = this.rowOf(stave);
		const { rect: natural, markWidth } = this.tempoLayout(task, targetX, baseY);
		const placed = this.collisionResolver.liftClear(
			natural,
			TEMPO_NOTE_CLEARANCE,
			{ kinds: TEXT_CLEAR_KINDS, band },
		);
		// liftClear only translates, so the box's rise is the mark's y-shift.
		const shiftY = placed.y - natural.y;
		this.recordAnnotationSpill(stave, placed);
		this.context.save();
		this.context.scale(TEMPO_SCALE, TEMPO_SCALE);
		// Everything below is drawn in the scaled space, so its coordinates are pre-divided too.
		let cursor = targetX / TEMPO_SCALE;
		const tempo = task.tempo;
		if (tempo) {
			new StaveTempo(
				{
					duration: tempo.duration,
					dots: tempo.dots,
					bpm: tempo.bpm,
					// StaveTempo prints the bpm only when there is no second unit, so the
					// metric-modulation form drops the number on its own.
					duration2: tempo.duration2 ?? undefined,
					dots2: tempo.dots2,
					parenthesis: tempo.parenthesis,
				},
				cursor - shiftX - 10,
				(baseY + shiftY) / TEMPO_SCALE - baseY,
			)
				.setStave(stave)
				.setPosition(position)
				.setContext(this.context)
				.draw();
			cursor += markWidth;
		}
		if (task.modulation) {
			new MetronomeGlyph(task.modulation).draw(
				this.context,
				cursor,
				(baseY + shiftY) / TEMPO_SCALE,
			);
		}
		this.context.restore();
		this.collisionResolver.add({ rect: placed, kind: 'annotation', band });
		return placed.y;
	}

	/*
	 * The total kerned advance of a chord symbol as drawHarmony draws it: accidentals render a
	 * touch smaller and pull in by HARMONY_ACCIDENTAL_KERN on each side. Measured so the symbol's
	 * collision box matches the glyphs that get drawn.
	 */
	private harmonyWidth(text: string): number {
		let width = 0;
		for (const ch of text) {
			const accidental = HARMONY_ACCIDENTALS.has(ch);
			this.context.setFont(
				this.labelFont,
				accidental ? HARMONY_ACCIDENTAL_FONT_SIZE : HARMONY_FONT_SIZE,
			);
			width +=
				this.context.measureText(ch).width -
				(accidental ? 2 * HARMONY_ACCIDENTAL_KERN : 0);
		}
		return width;
	}

	/*
	 * Draw a chord symbol (from a <harmony>) above its note's stave, left-anchored at the note's
	 * x — the laid-out position of the note the harmony applies to. The collision resolver lifts
	 * it clear of any notehead, high tie, or already-placed annotation it would land on (all
	 * registered as obstacles); it sits at a fixed gap above the top staff line when nothing is in
	 * the way. Returns the y the text reaches up to so the caller can grow the page crop above it.
	 * Drawn after the notes are formatted so getAbsoluteX is real.
	 */
	private drawHarmony(staveNote: StaveNote | TabNote, text: string): number {
		const stave = staveNote.getStave();
		if (!stave) {
			return Infinity;
		}
		const baseY = stave.getYForLine(0) - HARMONY_Y_OFFSET;
		this.context.save();
		this.context.setFillStyle(this.textColor);
		// Pad the box below the text baseline so liftClear's downward probe reaches a notehead
		// sitting just under the baseline (a note in the top stave space) and nudges the symbol
		// clear of it, leaving a little breathing room. The drawn baseline stays HARMONY_PADDING
		// above the box bottom, so with nothing in the way the symbol keeps its default position.
		const natural = new Rect(
			staveNote.getAbsoluteX(),
			baseY - HARMONY_FONT_SIZE,
			this.harmonyWidth(text),
			HARMONY_FONT_SIZE + HARMONY_PADDING,
		);
		const band = this.rowOf(stave);
		const placed = this.collisionResolver.liftClear(
			natural,
			HARMONY_NOTE_CLEARANCE,
			{ kinds: TEXT_CLEAR_KINDS, band },
		);
		this.recordAnnotationSpill(stave, placed);
		const y = placed.bottom - HARMONY_PADDING;
		// The ♯/♭/♮ glyphs carry wide side-bearings in the text font, so a single fillText
		// of "B♭" reads as "B ♭". Draw char by char and pull the accidental in on both sides
		// so it sits tight against its root letter.
		this.context.setFont(this.labelFont, HARMONY_FONT_SIZE);
		let x = placed.x;
		for (const ch of text) {
			const accidental = HARMONY_ACCIDENTALS.has(ch);
			if (accidental) {
				x -= HARMONY_ACCIDENTAL_KERN;
				this.context.setFont(this.labelFont, HARMONY_ACCIDENTAL_FONT_SIZE);
			}
			this.context.fillText(ch, x, y);
			x += this.context.measureText(ch).width;
			if (accidental) {
				x -= HARMONY_ACCIDENTAL_KERN;
				this.context.setFont(this.labelFont, HARMONY_FONT_SIZE);
			}
		}
		this.context.restore();
		// Register the placed symbol so a later annotation in this system stacks above it.
		this.collisionResolver.add({ rect: placed, kind: 'annotation', band });
		return placed.y;
	}

	/*
	 * Draw a words direction (e.g. "ritardando") beside the stave in italics, left-anchored at
	 * the x of the note it applies to. `placement` picks the side: 'above' is the default and
	 * lifts clear of any notehead/tie/annotation in its column, 'below' is the mirror image —
	 * it drops clear of everything hanging under the stave (low notes, stems, lyrics, an
	 * earlier below-stave mark) via the same resolver with the sign flipped. With nothing in
	 * the way either sits at a fixed gap from the near staff line. Returns the placed box so
	 * the caller can grow the page crop on the side the text reached. Drawn after the notes
	 * are formatted so getAbsoluteX is real.
	 *
	 * `style` picks the face: italic text-font by default (a words directive), or the
	 * notation font at the dynamics size for a marking spelled in SMuFL glyphs.
	 */
	private drawWords(
		stave: Stave,
		text: string,
		anchor: StaveNote | TabNote | number | undefined,
		placement: Placement = 'above',
		style: SideTextStyle = {
			font: this.labelFont,
			size: WORDS_FONT_SIZE,
			italic: true,
		},
	): Rect {
		const below = placement === 'below';
		const baseY = below
			? stave.getBottomLineY() + WORDS_Y_OFFSET
			: stave.getYForLine(0) - WORDS_Y_OFFSET;
		const anchorX =
			typeof anchor === 'number'
				? anchor
				: (anchor?.getAbsoluteX() ?? stave.getNoteStartX());
		this.context.save();
		this.context.setFont(
			style.font,
			style.size,
			'normal',
			style.italic ? 'italic' : 'normal',
		);
		this.context.setFillStyle(style.color ?? this.textColor);
		const w = this.context.measureText(text).width;
		const natural = new Rect(
			anchorX -
				(style.align === 'center' ? w / 2 : style.align === 'right' ? w : 0),
			below ? baseY : baseY - style.size,
			w,
			style.size,
		);
		const band = this.rowOf(stave);
		const cleared = below
			? this.collisionResolver.dropClear(natural, WORDS_NOTE_CLEARANCE, {
					kinds: TEXT_CLEAR_KINDS,
					band,
				})
			: this.collisionResolver.liftClear(natural, WORDS_NOTE_CLEARANCE, {
					kinds: TEXT_CLEAR_KINDS,
					band,
				});
		// The stave's opening modifiers own everything left of the note start x — clef, key,
		// time, and a begin-repeat's bars, which on a multi-stave system a connector carries
		// straight up through the band this text sits in (no lift can clear a line that spans
		// the whole gap). A tab annotation is CENTERED on its note (see drawAnnotations), so
		// over a measure's first note its left half reaches back into that area and prints
		// through the sign. Bound note-anchored text on the left by the note area — but not on
		// the right by the barline: a trailing "rit." on a measure's last note is supposed to
		// overrun it, so the right bound is the page, which the viewport nudge below owns.
		// Only note-anchored text: a caller passing an explicit x (the segno/coda at the
		// stave's left edge, the "Nx" on the closing barline) is stating where it wants to be.
		const bounded =
			typeof anchor === 'number'
				? cleared
				: this.collisionResolver.nudgeInsideX(
						cleared,
						new Rect(
							stave.getNoteStartX(),
							cleared.y,
							this.scratchViewport.right - stave.getNoteStartX(),
							cleared.h,
						),
					);
		// A mark anchored near the right edge would run off the canvas and be clipped (there's
		// no horizontal crop-growth knob), so pull it back inside — the same treatment a chord
		// diagram at the edge gets.
		const placed = this.collisionResolver.nudgeInsideX(
			bounded,
			this.scratchViewport,
			PAGE_MARGIN_X,
		);
		if (below) {
			this.recordAnnotationDrop(stave, placed);
		} else {
			this.recordAnnotationSpill(stave, placed);
		}
		this.context.fillText(text, placed.x, placed.bottom);
		this.context.restore();
		this.collisionResolver.add({ rect: placed, kind: 'annotation', band });
		return placed;
	}

	/*
	 * Draw the <bracket> and <dashes> spans: a horizontal line over (or under) the notes each
	 * one covers, stroked solid, dashed or dotted as its line-type says, terminating in the
	 * hook its `line-end` names. A hook points toward the staff by default ('down' above the
	 * staff), which is what makes a bracket read as enclosing the passage rather than as a
	 * stray rule.
	 *
	 * Drawn straight on the context rather than as a vexflow element: TextBracket, the nearest
	 * thing vexflow has, hooks only its stop end and only downward, so it can draw none of the
	 * five bracket forms MusicXML spells out. Placement is vexflow's own above/below-stave text
	 * line, the same fixed anchor the ottava brackets above use (see docs/collision-audit.md).
	 * ponytail: 'arrow' draws the same tick 'down' does — an arrowhead needs its own path and no
	 * fixture asks for one.
	 */
	private drawDirectionLines(): void {
		for (const span of this.directionLineSpans) {
			const start = this.byLead.get(span.from);
			const stop = this.byLead.get(span.to);
			// Either endpoint off a hidden staff leaves nothing to draw.
			if (!start || !stop) {
				continue;
			}
			const left = start.getAbsoluteX();
			const right = stop.getAbsoluteX() + stop.getGlyphWidth();
			// A span that wraps onto a later system runs right-to-left here; dropped rather than
			// drawn backwards (the same limit octaveShiftsOf documents).
			if (right <= left) {
				continue;
			}
			const stave = start.checkStave();
			const y = span.above
				? stave.getYForTopText(DIRECTION_LINE_TEXT_LINE)
				: stave.getYForBottomText(DIRECTION_LINE_TEXT_LINE);
			// A hook drops toward the staff from an above-stave line and rises toward it from a
			// below-stave one, so the whole bracket flips with its placement.
			const toward = span.above ? 1 : -1;
			const hookOf = (end: LineEnd) =>
				end === 'none'
					? 0
					: (end === 'up' ? -1 : 1) * toward * DIRECTION_LINE_HOOK;
			this.context.save();
			this.context.setStrokeStyle(this.notationColor);
			this.context.setLineWidth(1);
			if (span.dash) {
				this.context.setLineDash(span.dash);
			}
			this.context.beginPath();
			const startHook = hookOf(span.startEnd);
			if (startHook) {
				this.context.moveTo(left, y + startHook);
				this.context.lineTo(left, y);
			} else {
				this.context.moveTo(left, y);
			}
			this.context.lineTo(right, y);
			const stopHook = hookOf(span.stopEnd);
			if (stopHook) {
				this.context.lineTo(right, y + stopHook);
			}
			this.context.stroke();
			this.context.closePath();
			this.context.restore();
			this.pageTop = Math.min(this.pageTop, y - DIRECTION_LINE_HOOK);
			this.pageBottom = Math.max(this.pageBottom, y + DIRECTION_LINE_HOOK);
		}
	}

	/*
	 * Draw a gap measure's overlay: the optional fill painted over its (empty) note area
	 * — after the staves, so it dims the staff lines under it — and the optional label
	 * centered in that area, vertically centered on the system's staves. The area starts
	 * at the stave's note-start x so the fill never covers a clef/key/time the gap's
	 * stave prints at a system start.
	 */
	private drawGapOverlay(m: number): void {
		const gap = this.gaps.get(m);
		if (!gap || !this.systemTop || !this.systemBottom) {
			return;
		}
		const startX = this.systemTop.getNoteStartX();
		const endX = this.measureX + this.measureWidth;
		const top = this.systemTop.getYForLine(0);
		const bottom = this.systemBottom.getBottomLineY();
		this.context.save();
		if (gap.style?.fill) {
			this.context.setFillStyle(gap.style.fill);
			this.context.fillRect(
				startX,
				top,
				Math.max(0, endX - startX),
				bottom - top,
			);
		}
		if (gap.label) {
			const fontSize = gap.style?.fontSize ?? GAP_LABEL_FONT_SIZE;
			this.context.setFont(gap.style?.fontFamily ?? this.labelFont, fontSize);
			this.context.setFillStyle(gap.style?.fontColor ?? this.textColor);
			const tw = this.context.measureText(gap.label).width;
			// Baseline sits ~0.35em below the vertical center, landing the cap-height
			// visual center on the midline (the part-label +1.5px trick, size-relative).
			this.context.fillText(
				gap.label,
				(startX + endX) / 2 - tw / 2,
				(top + bottom) / 2 + fontSize * 0.35,
			);
		}
		this.context.restore();
	}

	/*
	 * Draw the `<part-group>` symbols at a system start: one connector per group, from its
	 * first member part's top stave down to its last member's bottom stave. Nested groups
	 * step further left of the system so an inner symbol doesn't print over its outer one —
	 * the same "the connector's x comes from its top stave" nudge the notation+tab bracket
	 * uses, just repeated per depth.
	 *
	 * The nudge is restored right after each draw, so nothing downstream sees a moved stave.
	 */
	private drawPartGroupConnectors(): void {
		const maxDepth = Math.max(0, ...this.partGroups.map((g) => g.depth));
		for (const group of this.partGroups) {
			const top = this.partStaves[group.fromPart]?.top;
			const bottom = this.partStaves[group.toPart]?.bottom;
			if (!top || !bottom) {
				continue;
			}
			// The innermost group hugs the system; each level out steps further left. Depth
			// counts inward, so invert it.
			top.setX(
				this.measureX -
					BRACKET_X_SHIFT -
					PART_GROUP_STEP * (maxDepth - group.depth),
			);
			new StaveConnector(top, bottom)
				.setType(group.symbol === 'line' ? 'singleLeft' : group.symbol)
				.setContext(this.context)
				.draw();
			top.setX(this.measureX);
		}
	}

	/*
	 * Print each `<part-group>`'s `<group-name>` at the first system's start, in the column of
	 * the left indent that sits OUTSIDE the part labels (see ScoreLayout.partLabelIndent) and
	 * vertically centered on the parts the group spans — the section heading a bracket in an
	 * orchestral score carries ("Oboe through Clarinet" over its three staves).
	 *
	 * Right-aligned like the part labels, so with several groups every name ends at the same x.
	 * Only drawn with showPartLabels on; the indent it needs is only reserved then.
	 */
	private drawPartGroupNames(): void {
		if (this.systemIndex !== 0 || this.labelIndent <= this.partLabelIndent) {
			return;
		}
		this.context.save();
		this.context.setFont(this.labelFont, LABEL_FONT_SIZE);
		this.context.setFillStyle(this.textColor);
		for (const group of this.partGroups) {
			const top = this.partStaves[group.fromPart]?.top;
			const bottom = this.partStaves[group.toPart]?.bottom;
			if (!group.name || !top || !bottom) {
				continue;
			}
			const width = this.context.measureText(group.name).width;
			// Centered on the staff lines the group spans, the same measure (and the same
			// +1.5 baseline nudge) a part label uses.
			const cy = (top.getYForLine(0) + bottom.getBottomLineY()) / 2;
			this.context.fillText(
				group.name,
				this.measureX - this.partLabelIndent - LABEL_GAP - width,
				cy + 1.5,
			);
		}
		this.context.restore();
	}

	/*
	 * Join the whole system across all parts with a shared left line at the
	 * system start, and a closing line at the system end.
	 */
	private drawConnectors(): void {
		if (this.systemTop && this.systemBottom && this.totalStaves > 1) {
			if (this.isSystemStart) {
				// Every multi-stave system gets a plain left line closing the staves' left
				// edge. A notation+tab pair split across separate parts also gets a bracket
				// (the cross-part analog of the single-part bracket), drawn just outside it.
				new StaveConnector(this.systemTop, this.systemBottom)
					.setType('singleLeft')
					.setContext(this.context)
					.draw();
				if (
					partsPairTabWithNotation(this.parts, this.showTabs, this.showNotation)
				) {
					// The bracket's x comes entirely from its top stave; nudge that 4px left
					// so the bracket sits just outside the system line with a small gap, then
					// restore.
					this.systemTop.setX(this.measureX - BRACKET_X_SHIFT);
					new StaveConnector(this.systemTop, this.systemBottom)
						.setType('bracket')
						.setContext(this.context)
						.draw();
					this.systemTop.setX(this.measureX);
				}
				this.drawPartGroupConnectors();
				this.drawPartGroupNames();
			}
			// A repeat's bars run the full height of the system like any other barline, but its
			// dots belong to each stave — and no connector type draws dots. So each stave draws
			// the whole sign itself and a bold-double connector retraces just the bars: vexflow
			// gives it the same geometry it gives a repeat barline, so it lands exactly over the
			// per-stave bars and fills the gaps between staves.
			if (this.begRepeatX !== null) {
				this.drawRepeatConnector(
					'boldDoubleLeft',
					this.begRepeatX - this.systemTop.getX(),
				);
			}
			// Every measure's end line gets a connector joining the part's staves, so
			// internal barlines are tied across staves and not just drawn per-stave.
			// The piece's final measure gets a bold thin-thick connector to match its
			// end barline; all other measure ends get a plain single line.
			if (this.decoration.repeatEnd) {
				this.drawRepeatConnector('boldDoubleRight');
				// A back-to-back sign closes and reopens on the same line: the reopening half
				// sits at the same x, so its connector shifts out to the measure's right edge.
				if (this.repeatBoth) {
					this.drawRepeatConnector('boldDoubleLeft', this.systemTop.getWidth());
				}
				return;
			}
			// ponytail: on a MULTI-stave system only light-light and light-heavy change the
			// connector — StaveConnector's own vocabulary is thin / thinDouble / boldDoubleRight,
			// with no dotted, dashed or heavy member, so the exotic styles fall back to the plain
			// line there. Single-stave scores (where these styles actually show up) get the full
			// vocabulary via drawCustomBarline; widen this if a multi-stave fixture needs it.
			const type =
				this.barStyle === 'light-light'
					? 'thinDouble'
					: this.barStyle === 'light-heavy' || this.isLastMeasure
						? 'boldDoubleRight'
						: 'singleRight';
			for (const run of this.barlineRuns()) {
				new StaveConnector(run.top, run.bottom)
					.setType(type)
					.setContext(this.context)
					.draw();
			}
		}
	}

	/*
	 * The vertical runs a measure's barline connector is drawn in — one per unbroken stretch of
	 * parts (see barlineBreaks), which by default means one run per part. A run always spans
	 * whole parts: a part's own staves are joined by its barline, which is what the brace on a
	 * grand staff means. An ungrouped single-part system has no breaks and yields one run.
	 */
	private barlineRuns(): Array<{ top: Stave; bottom: Stave }> {
		const systemTop = this.systemTop;
		const systemBottom = this.systemBottom;
		if (!systemTop || !systemBottom) {
			return [];
		}
		if (this.barlineBreaks.size === 0) {
			return [{ top: systemTop, bottom: systemBottom }];
		}
		const runs: Array<{ top: Stave; bottom: Stave }> = [];
		let top: Stave | undefined;
		let bottom: Stave | undefined;
		for (const [partIndex, staves] of this.partStaves.entries()) {
			// A part with no measure in this column has no staves; it can't close a run, and
			// leaving the open one running past it matches what the single-connector path did.
			if (staves) {
				top ??= staves.top;
				bottom = staves.bottom;
			}
			if (this.barlineBreaks.has(partIndex) && top && bottom) {
				runs.push({ top, bottom });
				top = undefined;
				bottom = undefined;
			}
		}
		if (top && bottom) {
			runs.push({ top, bottom });
		}
		// A run of one stave draws nothing useful (a connector needs two), but the stave's own
		// end barline already covers it — so the empty case is correct, not a gap.
		return runs;
	}

	/*
	 * Paint this measure's end barline for the <bar-style> values vexflow has no Barline type
	 * for (see CUSTOM_BAR_STYLES). buildStave left the stave's end bar as NONE for these, so
	 * this is the only line drawn there, laid down right after the stave so it sits under the
	 * notes like any other barline. A repeat sign at the same edge wins and is already drawn,
	 * so it suppresses this.
	 */
	private drawCustomBarline(stave: Stave): void {
		if (this.decoration.repeatEnd || this.repeatBoth || !this.barStyle) {
			return;
		}
		this.paintBarStyle(stave, stave.getX() + stave.getWidth(), this.barStyle);
	}

	/* Paint one <bar-style> vexflow has no Barline type for, as a vertical stroke at `x` on
	 * `stave` (see CUSTOM_BAR_STYLES). A style vexflow does draw is a no-op here — it was
	 * already drawn with the stave, or with the mid-measure BarNote standing in its place. */
	private paintBarStyle(stave: Stave, x: number, barStyle: string): void {
		const style = CUSTOM_BAR_STYLES[barStyle];
		if (!style) {
			return;
		}
		const spacing = stave.getSpacingBetweenLines();
		const topY = stave.getTopLineTopY();
		// A `span` is measured in staff spaces down from the top line; without one the bar
		// runs the full stave height, the way every vexflow barline does.
		const [from, to] = style.span ?? [0, 0];
		const y = style.span ? topY + from * spacing : topY;
		const height = style.span
			? (to - from) * spacing
			: stave.getBottomLineBottomY() - topY;
		this.context.save();
		this.context.setFillStyle(this.notationColor);
		for (const [offset, width] of style.bars) {
			if (style.dash) {
				// fillRect can't dash, so walk the stroke in [on, off] runs. The last run is
				// clipped to the bar's height rather than overshooting past the bottom line.
				const [on, off] = style.dash;
				for (let dy = 0; dy < height; dy += on + off) {
					this.context.fillRect(
						x + offset,
						y + dy,
						width,
						Math.min(on, height - dy),
					);
				}
			} else {
				this.context.fillRect(x + offset, y, width, height);
			}
		}
		this.context.restore();
	}

	/* One half of a repeat sign carried down the system. `xShift` moves a left-sided connector
	 * off the stave's left edge — an opening repeat prints after the clef and signatures, and a
	 * back-to-back one prints at the measure's right edge. */
	private drawRepeatConnector(
		type: 'boldDoubleLeft' | 'boldDoubleRight',
		xShift = 0,
	): void {
		if (!this.systemTop || !this.systemBottom) {
			return;
		}
		new StaveConnector(this.systemTop, this.systemBottom)
			.setType(type)
			.setXShift(xShift)
			.setContext(this.context)
			.draw();
	}

	/*
	 * After the measure loop: resolve the whole-score spanners, grow the measure boxes,
	 * and compute the per-system overflow this pass observed.
	 */
	private finishPass(): {
		pageTop: number;
		pageBottom: number;
		observedOverflow: Map<number, number>;
		observedStaveSpill: Map<number, Map<number, StaveSpill>>;
		observedLyricDrops: Map<string, number>;
		lyricsStepped: boolean;
		observedVoltaLifts: Map<number, number>;
		voltasLifted: boolean;
		rawNotes: RawNote[];
		rawMeasures: RawMeasure[];
		rawChordDiagrams: RawChordDiagram[];
	} {
		// The last system's content is never followed by a system-change reset, so check it
		// for clipped content here.
		this.warnEscapes();

		// Grow each measure box up to the topmost above-stave text decoration (chord symbol, words)
		// in its system, so the measure's bounding box — and the playback cursor and auto-scroll that
		// ride on it — cover those extras instead of clipping them. Chord diagrams are excluded (they
		// don't feed systemDecorationTop), so the cursor bar stops at the stave, not the fret box.
		for (const [i, measure] of this.rawMeasures.entries()) {
			const top = this.systemDecorationTop.get(measure.systemIndex);
			const { rect } = measure;
			if (top !== undefined && top < rect.y) {
				this.rawMeasures[i] = {
					...measure,
					rect: new Rect(rect.x, top, rect.w, rect.bottom - top),
				};
			}
		}

		// Ties and slurs are resolved over the whole score now that every note is
		// placed, so a span can cross a barline (its endpoints sit in different
		// measures). Drawn last, on top of the notes.
		for (const tie of this.spanners.buildTies(this.allChords, this.byLead)) {
			tie.setContext(this.context).draw();
		}
		// The bows, kept for the hairpin pass below: a wedge parks at a fixed gap from the
		// staff, which is the same band a slur bowing the same way lands in.
		const slurBows: { stave: Stave; rect: Rect }[] = [];
		for (const slur of this.spanners.buildSlurs(this.allChords, this.byLead)) {
			// drawWithStyle, not draw: Curve.draw never applies its own style, and a
			// <slur line-type> rides on the element as a lineDash (see buildSlurs).
			slur.curve.setContext(this.context).drawWithStyle();
			// The bow is ink like any other, so the page has to cover it: a slur arcing over
			// the top stave of the first system rises into the cropped top slack, and one
			// dipping under the last system's bottom stave hangs past the floor. Without this
			// the crop cuts the arc off mid-air.
			this.pageTop = Math.min(this.pageTop, slur.top);
			this.pageBottom = Math.max(this.pageBottom, slur.bottom);
			// A bow arcs past the notes it joins, so it can reach further off the stave than
			// anything the note pass measured — a slur over a beamed group climbs over the
			// beam, and in a song that lands on the singer's lyrics. Report it as spill so
			// pass two opens the gap instead (the arc is pinned to its noteheads and has
			// nowhere else to go).
			//
			// Except a cross-stave bow, which is a passenger in the gap rather than a thing
			// the gap has to hold: its height IS the distance between the two staves, so
			// reporting it would have the gap widen to make room for a curve that then grows
			// to match. Same reason crossStaveNotes drops a cross-staff stem tip.
			const row = slur.stave && this.rowByStave.get(slur.stave);
			if (slur.stave && row !== undefined && !slur.crossStave) {
				this.recordStaveSpill(
					{ stave: slur.stave, row },
					new Rect(
						slur.left,
						slur.top,
						slur.right - slur.left,
						slur.bottom - slur.top,
					),
				);
			}
			// And against the system above: a bow over a middle system's top stave has nothing
			// but the previous system over it, so report it the way an above-placed wedge does.
			const slurSystem = slur.stave && this.systemByStave.get(slur.stave);
			if (slurSystem !== undefined) {
				this.systemHighestTop.set(
					slurSystem,
					Math.min(this.systemHighestTop.get(slurSystem) ?? Infinity, slur.top),
				);
			}
			if (slur.stave) {
				slurBows.push({
					stave: slur.stave,
					rect: new Rect(
						slur.left,
						slur.top,
						slur.right - slur.left,
						slur.bottom - slur.top,
					),
				});
			}
		}
		// Tablature hammer-ons/pull-offs and slides, likewise resolved over the whole score.
		for (const tie of this.spanners.buildHammerPulls(
			this.allTabChords,
			this.byTabLead,
		)) {
			tie.setContext(this.context).draw();
		}
		for (const slide of this.spanners.buildSlides(
			this.allTabChords,
			this.byTabLead,
			this.showTabSlideText,
		)) {
			slide.setContext(this.context).draw();
		}
		// Standard-notation glissandos/slides (the StaveLine counterpart of the tab
		// slides above), e.g. a grace note that slides into the note it precedes.
		for (const line of this.spanners.buildGlissandos(
			this.allChords,
			this.byLead,
		)) {
			line.setContext(this.context).draw();
		}
		// Ottava brackets (<octave-shift>): the "8va"/"15mb" label and its dashed line over
		// (or under) the notes it covers. The notes were already drawn at the shifted
		// position by buildNotes; this is the label that says so.
		for (const span of this.octaveShiftSpans) {
			const first = span.notes[0];
			const last = span.notes.at(-1);
			const start = first && this.byLead.get(first);
			const stop = last && this.byLead.get(last);
			// Either endpoint off a hidden staff leaves nothing to bracket.
			if (!start || !stop) {
				continue;
			}
			const bracket = new TextBracket({
				start,
				stop,
				text: span.label,
				superscript: span.suffix,
				position: span.above
					? TextBracket.Position.TOP
					: TextBracket.Position.BOTTOM,
			});
			this.clearOctaveBracket(
				bracket,
				span.notes
					.map((note) => this.byLead.get(note))
					.filter((note): note is StaveNote => note !== undefined),
				span.above,
			);
			bracket.setContext(this.context).draw();
		}
		this.drawDirectionLines();
		// Trill extension lines, resolved over the whole score like the other spanners so a
		// trill can be held across a barline.
		for (const bracket of this.spanners.buildWavyLines(
			this.allChords,
			this.byLead,
		)) {
			bracket.setContext(this.context).draw();
		}
		// Hairpins, like the pedals below them, are resolved over the whole score so a wedge
		// can open in one measure and close in another. A below-stave one reaches under the
		// staff, so grow the bottom crop to its drawn extent.
		for (const wedge of this.spanners.buildWedges(
			this.allWedges,
			this.byLead,
		)) {
			this.clearWedge(wedge, slurBows);
			wedge.setContext(this.context).draw();
			this.pageTop = Math.min(this.pageTop, wedge.bounds.top);
			this.pageBottom = Math.max(this.pageBottom, wedge.bounds.bottom);
			// A wedge pushed out past a slur can reach the neighbouring stave, so report the band
			// it ended up in and let pass two open the gap — within the system as spill, and
			// against the system above as overflow (an above-placed wedge on a system's top
			// stave has nothing but the previous system over it).
			const row = this.rowByStave.get(wedge.stave);
			if (row !== undefined) {
				this.recordStaveSpill({ stave: wedge.stave, row }, wedge.rect);
			}
			const system = this.systemByStave.get(wedge.stave);
			if (system !== undefined) {
				this.systemHighestTop.set(
					system,
					Math.min(
						this.systemHighestTop.get(system) ?? Infinity,
						wedge.bounds.top,
					),
				);
			}
		}
		// Pedals draw under the stave (vexflow's getYForBottomText), below the notes, so
		// grow the bottom crop to keep their "Ped…*" text / bracket from being clipped.
		// ponytail: only the final crop is grown — a pedal on a non-last system isn't
		// reserved against the system below it; add that if a fixture stacks one there.
		for (const { marking, notes } of this.spanners.buildPedals(
			this.allPedals,
			this.byLead,
			this.allChords,
		)) {
			this.dropPedalClear(marking, notes);
			marking.setContext(this.context).draw();
		}
		for (const marker of this.allPedals) {
			const stave = this.byLead.get(marker.lead)?.getStave();
			if (stave) {
				this.pageBottom = Math.max(
					this.pageBottom,
					stave.getYForBottomText(PEDAL_BOTTOM_TEXT_LINE) + PEDAL_BOTTOM_MARGIN,
				);
			}
		}

		// How far each system rose above its top stave. The first system uses the cropped top
		// slack instead, so it's excluded (it never reserves space against a system above it).
		const observedOverflow = new Map<number, number>();
		for (const [idx, topY] of this.systemTopByIndex) {
			const highest = this.systemHighestTop.get(idx);
			if (idx > 0 && highest !== undefined) {
				observedOverflow.set(idx, Math.max(0, topY - highest));
			}
		}
		return {
			pageTop: this.pageTop,
			pageBottom: this.pageBottom,
			observedOverflow,
			observedStaveSpill: this.staveSpill,
			observedLyricDrops: this.observedLyricDrops,
			lyricsStepped: this.lyricsStepped,
			observedVoltaLifts: this.observedVoltaLifts,
			voltasLifted: [...this.observedVoltaLifts].some(
				([system, lift]) => lift !== (this.voltaLifts.get(system) ?? 0),
			),
			rawNotes: this.rawNotes,
			rawMeasures: this.rawMeasures,
			rawChordDiagrams: this.rawChordDiagrams,
		};
	}

	/*
	 * Drop a pedal's band below anything of its own that hangs under the staff — a low
	 * notehead and its ledger lines — instead of drawing the "Ped." glyph through it.
	 * vexflow positions the whole marking off one `line` offset, so the band moves as a
	 * unit and the drop converts to line units.
	 *
	 * The shared collision index is per-system (cleared at each system boundary) and pedals
	 * resolve after the last system, so this scopes a resolver to the pedal's own notes
	 * rather than reading a stale obstacle from an unrelated system at the same x.
	 */
	private dropPedalClear(marking: PedalMarking, notes: StaveNote[]): void {
		const stave = notes[0]?.getStave();
		if (!stave) {
			return;
		}
		const hw = this.translator.noteheadHalfWidth();
		const xs = notes.map((note) => note.getAbsoluteX());
		const left = Math.min(...xs) - hw;
		const baseline = stave.getYForBottomText(PEDAL_BOTTOM_TEXT_LINE);
		const natural = new Rect(
			left,
			baseline - PEDAL_INK_RISE,
			Math.max(...xs) + hw - left,
			PEDAL_INK_RISE,
		);
		const scoped = new CollisionResolver(this.scratchViewport);
		for (const note of notes) {
			scoped.add({ rect: this.noteRect(note), kind: 'note' });
		}
		const placed = scoped.dropClear(natural, WORDS_NOTE_CLEARANCE);
		marking.setLine((placed.y - natural.y) / stave.getSpacingBetweenLines());
		this.pageBottom = Math.max(
			this.pageBottom,
			placed.bottom + PEDAL_BOTTOM_MARGIN,
		);
	}

	/*
	 * Move a hairpin further from the staff until it clears any slur bowing into its band. A
	 * wedge parks at a fixed gap from the staff, which is exactly where a slur on the same
	 * side lands — an under-slur over low notes dips straight through a below-stave crescendo.
	 * The slur can't yield (it's pinned to its noteheads), so the wedge is the one that moves.
	 *
	 * Scoped like {@link dropPedalClear}: the shared index is per-system and wedges resolve
	 * after the last one, so this indexes only the bows drawn over this wedge's own stave.
	 */
	private clearWedge(
		wedge: Hairpin,
		bows: { stave: Stave; rect: Rect }[],
	): void {
		const natural = wedge.rect;
		const scoped = new CollisionResolver(this.scratchViewport);
		for (const bow of bows) {
			if (bow.stave === wedge.stave) {
				scoped.add({ rect: bow.rect, kind: 'tie' });
			}
		}
		const placed = wedge.above
			? scoped.liftClear(natural, WORDS_NOTE_CLEARANCE)
			: scoped.dropClear(natural, WORDS_NOTE_CLEARANCE);
		wedge.setOffset(wedge.above ? natural.y - placed.y : placed.y - natural.y);
	}

	/*
	 * Move an ottava bracket's row further from the stave until its label clears the notes it
	 * covers. vexflow parks a TextBracket one text line off the staff, which is right until a
	 * beam reaches into that band — a stem-down beam under an "8vb", a stem-up one over an
	 * "8va" — and then the label is drawn straight through the beam line.
	 *
	 * Same shape as {@link dropPedalClear}: a scoped resolver over the span's own notes (the
	 * shared index is per-system and brackets resolve after the last one), and the resolved
	 * shift converted back into the single `line` offset vexflow positions the whole bracket
	 * from. The note obstacles reach the beam-extended stem tip, which is what makes the beam
	 * visible to the probe at all (see noteRect).
	 */
	private clearOctaveBracket(
		bracket: TextBracket,
		notes: StaveNote[],
		above: boolean,
	): void {
		const stave = notes[0]?.getStave();
		if (!stave) {
			return;
		}
		// The baseline vexflow would draw the label on, reproduced from TextBracket.draw.
		// renderText draws upward from a baseline, so the label's ink band is the one font
		// size above it.
		// TextBracket adds Tables.TEXT_HEIGHT_OFFSET_HACK (1, and not exported) to a
		// below-stave line, so match it here or the probe measures the wrong row.
		const baseline = above
			? stave.getYForTopText(OTTAVA_TEXT_LINE)
			: stave.getYForBottomText(OTTAVA_TEXT_LINE + 1);
		const height = Font.convertSizeToPixelValue(bracket.fontInfo.size);
		const hw = this.translator.noteheadHalfWidth();
		const xs = notes.map((note) => note.getAbsoluteX());
		const left = Math.min(...xs) - hw;
		const natural = new Rect(
			left,
			baseline - height,
			Math.max(...xs) + hw - left,
			height,
		);
		const scoped = new CollisionResolver(this.scratchViewport);
		for (const note of notes) {
			scoped.add({ rect: this.noteRect(note), kind: 'note' });
		}
		const placed = above
			? scoped.liftClear(natural, WORDS_NOTE_CLEARANCE)
			: scoped.dropClear(natural, WORDS_NOTE_CLEARANCE);
		// getYForTopText counts away from the stave upward and getYForBottomText downward, so
		// the same "further out" shift has the opposite sign in line units.
		const shift =
			(above ? natural.y - placed.y : placed.y - natural.y) /
			stave.getSpacingBetweenLines();
		bracket.setLine(OTTAVA_TEXT_LINE + shift);
		this.pageTop = Math.min(this.pageTop, placed.y);
		this.pageBottom = Math.max(this.pageBottom, placed.bottom);
		// Report the band the label ended up in so pass two opens room for it — as spill
		// against the neighbouring stave inside the system (a piano 8va sits in the gap
		// under the vocal part's lyrics), and as overflow against the system above.
		const row = this.rowByStave.get(stave);
		if (row !== undefined) {
			this.recordStaveSpill({ stave, row }, placed);
		}
		const system = this.systemByStave.get(stave);
		if (system !== undefined && above) {
			this.systemHighestTop.set(
				system,
				Math.min(this.systemHighestTop.get(system) ?? Infinity, placed.y),
			);
		}
	}

	/*
	 * Note how far content on a stave row reached past its staff lines. `top`/`bottom` are
	 * absolute canvas y; they're stored relative to the stave so rows from different
	 * measures and systems (drawn at different y) accumulate into one per-row worst case.
	 *
	 * ponytail: only notation notes are measured — a tab row reports its staff lines alone,
	 * since its frets sit on them. Feed the tab bend/annotation extents in here too if one
	 * ever reaches the stave above.
	 */
	private recordStaveSpill(p: { stave: Stave; row: number }, rect: Rect): void {
		const spill = this.spillOf(this.systemOf(p.stave), p.row, p.stave);
		bandSpill(spill.rise, rect, p.stave.getYForLine(0) - rect.y);
		bandSpill(spill.drop, rect, rect.bottom - p.stave.getBottomLineY());
	}

	/*
	 * Register a printed measure number as a collision obstacle, measured with whatever font
	 * the caller has set on the context. It sits at the stave's left edge, which is exactly
	 * where a rehearsal mark anchors — without this the section header prints on top of it.
	 * `centered` matches vexflow's own placement (the number straddles the stave x); the
	 * bracket-occluded path draws it left-aligned instead.
	 */
	private addMeasureNumberObstacle(
		label: string,
		x: number,
		baseline: number,
		centered: boolean,
	): void {
		const ink = this.context.measureText(label);
		this.collisionResolver.add({
			rect: new Rect(
				centered ? x - ink.width / 2 : x,
				baseline + ink.y,
				ink.width,
				ink.height,
			),
			kind: 'annotation',
		});
	}

	/* Which stave row (of this measure's column) a stave sits on — the collision band its
	 * notes and annotations are registered under. */
	private rowOf(stave: Stave): number | undefined {
		return this.systemPending.find((p) => p.stave === stave)?.row;
	}

	/*
	 * Report how far an above-stave annotation reached over its stave, so pass two opens the
	 * gap to the stave above wide enough to hold it (see spacedOffsets). Banding the lift
	 * makes this converge: the reported rise is the stack height over this stave's own
	 * music, which doesn't depend on how far apart the staves currently sit.
	 */
	private recordAnnotationSpill(stave: Stave, rect: Rect): void {
		const row = this.rowOf(stave);
		if (row === undefined) {
			return;
		}
		const spill = this.spillOf(this.systemOf(stave), row, stave);
		bandSpill(spill.rise, rect, stave.getYForLine(0) - rect.y);
	}

	/*
	 * The below-stave mirror of {@link recordAnnotationSpill}: how far a below-stave
	 * annotation (a placement="below" direction, a dynamic) reached under its stave, so
	 * pass two opens the gap to the stave BELOW wide enough to hold it. Also grows the
	 * page/system bottom so a mark under the last stave isn't cropped off and the next
	 * system starts clear of it.
	 */
	private recordAnnotationDrop(stave: Stave, rect: Rect): void {
		this.pageBottom = Math.max(this.pageBottom, rect.bottom);
		this.systemContentBottom = Math.max(this.systemContentBottom, rect.bottom);
		const row = this.rowOf(stave);
		if (row === undefined) {
			return;
		}
		const spill = this.spillOf(this.systemOf(stave), row, stave);
		bandSpill(spill.drop, rect, rect.bottom - stave.getBottomLineY());
	}

	/* Which system a stave belongs to. Registered once the stave's part is built; the
	 * fallback covers a caller still inside the measure loop that placed it, where the
	 * current system IS its system. Spanners resolved after the last measure (slurs,
	 * wedges) have no current system, so for them the map is the only right answer. */
	private systemOf(stave: Stave): number {
		return this.systemByStave.get(stave) ?? this.systemIndex;
	}

	/* This row's spill record on this system, seeded on first sight with where the staff
	 * lines sit relative to the stave's y (which is what a stave offset positions). */
	private spillOf(system: number, row: number, stave: Stave): StaveSpill {
		let rows = this.staveSpill.get(system);
		if (!rows) {
			rows = new Map();
			this.staveSpill.set(system, rows);
		}
		let spill = rows.get(row);
		if (!spill) {
			spill = {
				rise: new Map(),
				drop: new Map(),
				lineTop: stave.getYForLine(0) - stave.getY(),
				lineBottom: stave.getBottomLineY() - stave.getY(),
			};
			rows.set(row, spill);
		}
		return spill;
	}

	private warnEscapes(): void {
		for (const { item, edges } of this.collisionResolver.escaping(
			this.scratchViewport,
		)) {
			if (edges.includes('top') || edges.includes('bottom')) {
				console.warn(
					`vexml: ${item.kind} clipped past the ${edges.join('/')} of the canvas ` +
						"(content in no-man's land — bump LEDGER_HEADROOM / topSlack).",
				);
			}
		}
	}

	private growDecorationTop(system: number, top: number): void {
		this.systemDecorationTop.set(
			system,
			Math.min(this.systemDecorationTop.get(system) ?? Infinity, top),
		);
	}
}
