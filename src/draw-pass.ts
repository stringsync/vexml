import {
	type BeamRun,
	type Chord,
	groupBeamRuns,
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
	Stem,
	type StemmableNote,
	type TabNote,
	TabStave,
	TextBracket,
	TimeSignature,
	Vibrato,
	type Voice,
	Volta,
} from 'vexflow';
import { CollisionResolver } from './collision-resolver';
import type { Config, Gap, MeasureNumbering } from './config';
import { type ConnectorColumn, ConnectorDrawer } from './connector-drawer';
import {
	BRACKET_X_SHIFT,
	GAP_LABEL_FONT_SIZE,
	GRACE_GROUP_SPACING_STAVE,
	LABEL_FONT_SIZE,
	LABEL_GAP,
	LYRIC_NOTE_CLEARANCE,
	LYRIC_Y_OFFSET,
	MULTI_REST_PADDING,
	OTTAVA_TEXT_LINE,
	PEDAL_BOTTOM_MARGIN,
	PEDAL_BOTTOM_TEXT_LINE,
	PEDAL_INK_RISE,
	TAB_CURVE_RISE,
	TECHNICAL_EDGE_GAP,
	TIE_APEX_RISE,
	VOLTA_LABEL_DROP,
	VOLTA_NOTE_CLEARANCE,
	VOLTA_STAVE_GAP,
	WORDS_NOTE_CLEARANCE,
} from './constants';
import {
	type DirectionColumn,
	DirectionPlacer,
	type DynamicsTask,
	type FiguredBassTask,
	type HarmonyTask,
	type TempoTask,
	type WordsTask,
} from './direction-placer';
import type { Gaps } from './gaps';
import { Rect } from './geometry';
import {
	GeometryCollector,
	type RawChordDiagram,
	type RawMeasure,
	type RawNote,
} from './geometry-collector';
import type { MeasureBox, ScoreLayout } from './layout-planner';
import { LyricPlacer } from './lyric-placer';
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
import type {
	DirectionLineSpan,
	MeasureEnding,
	OctaveShiftSpan,
	PartGroup,
	PedalMark,
	ScoreReader,
	StaffVoice,
	WedgeMark,
} from './score-reader';
import type { Hairpin, SpannerBuilder } from './spanner-builder';
import { SpillTracker, type StaveSpill } from './spill-tracker';

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

// One stave's notes, built but not yet formatted or drawn. A part's staves are
// formatted together (see formatAndDrawSystem) so notes at the same tick line up
// vertically across staves, so the build (voice/spanner construction) is split from
// the format+draw step.
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
function barlineDecorations(
	reader: ScoreReader,
	measures: readonly Measure[],
): BarlineDecoration[] {
	return reader
		.measureRepeats(measures)
		.map(({ repeatBegin, repeatEnd, repeatTimes, ending }) => ({
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
		}));
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
	private readonly geometry = new GeometryCollector();
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
	// The vertical measurements this pass takes for the next one: stave-row spill, system
	// top overflow, and the decoration ceiling measure boxes grow to.
	private readonly spill = new SpillTracker();
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
	// Verse baselines: shared per stave row, measured this pass and re-pinned on the next.
	private readonly lyricPlacer: LyricPlacer;
	// The beside-stave text the score types itself: rehearsal/tempo marks, chord
	// symbols/diagrams, words, dynamics, figured bass, direction lines. Fed the measure
	// loop's locals through directionColumn().
	private readonly directionPlacer: DirectionPlacer;

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
	private harmonyTasks: HarmonyTask[] = [];
	// Words directions (e.g. "ritardando"), each drawn on its stave's `placement` side at
	// the laid-out x of the note it applies to.
	private wordsTasks: WordsTask[] = [];
	// Dynamics markings (p, mf, sfz, …), queued like wordsTasks but drawn in the notation
	// font when `glyph` says the marking spells out of SMuFL's dynamic letters.
	private dynamicsTasks: DynamicsTask[] = [];
	// <figured-bass> stacks, queued like the other note-anchored annotations.
	private figuredBassTasks: FiguredBassTask[] = [];
	// A part's staves are built here, then formatted and drawn together below so
	// notes at the same tick align vertically across staves (notation over tab).
	private pendingStaves: PendingStave[] = [];
	// This measure column's top/bottom stave per part index, so a <part-group> connector
	// can span from one part's top stave to another's bottom. Sparse: a part with no
	// measure here has no entry.
	private partStaves: Array<{ top: Stave; bottom: Stave } | undefined> = [];
	// The <part-group> spans from the <part-list>, outermost first. Fixed for the score.
	private readonly partGroups: PartGroup[];
	// The vertical furniture joining staves: braces/brackets and part-group connectors at a
	// system start, barline runs across parts, custom/repeat barlines. Fed the measure
	// loop's locals through connectorColumn().
	private readonly connectorDrawer: ConnectorDrawer;
	// The score's <octave-shift> spans, and the per-note octave offset they imply. Fixed for
	// the score; both are filled in the constructor.
	private readonly octaveShiftSpans: OctaveShiftSpan[] = [];
	private readonly octaveShiftByNote = new Map<Note, number>();
	// The score's <bracket>/<dashes> spans, drawn once at the end alongside the other spanners.
	private readonly directionLineSpans: DirectionLineSpan[] = [];
	// Measured on the previous pass and reserved on this one; empty on the first pass.
	private readonly voltaLifts: Map<number, number>;

	constructor(
		private readonly translator: NoteTranslator,
		private readonly reader: ScoreReader,
		private readonly spanners: SpannerBuilder,
		config: Config,
		configuredGaps: Gaps,
		private readonly context: RenderContext,
		private readonly score: Score,
		layout: ScoreLayout,
		private readonly labelFont: string,
		readonly notationFont: string,
		topSlack: number,
		scratchHeight: number,
		private readonly topOverflow: Map<number, number>,
		opts: DrawPassOptions = {},
	) {
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
		const { measureNumbering, showTabSlideText } = config;
		this.measureNumbering = measureNumbering;
		this.showTabSlideText = showTabSlideText;
		this.showTabs = config.showTabs;
		this.showNotation = config.showNotation;
		this.notationColor = config.fonts.notation?.color ?? '#000000';
		this.textColor = config.fonts.text?.color ?? '#000000';
		this.parts = this.score.parts;
		this.gaps = configuredGaps.byMeasureIndex();
		// <multiple-rest> runs: the lead measure draws the consolidated bar instead of its own
		// notes, and the measures it swallows have no box (the layout planner dropped them), so
		// drawMeasureColumn returns early for them without any extra guard here.
		this.multiRests = this.reader.multiRestsOf(this.parts).leads;
		this.partGroups = this.reader.partGroups(this.score);
		// A notation+TAB pair split across parts is ONE instrument that just happens to be
		// written as two parts, and it's bracketed as one (see partsPairTabWithNotation), so
		// its barline runs through the pair too — the barline run has to agree with what the
		// connector groups, or the bracket says "one instrument" while the gap says "two".
		const barlineBreaks = this.reader.partsPairTabWithNotation(this.parts, {
			showTabs: this.showTabs,
			showNotation: this.showNotation,
		})
			? new Set<number>()
			: this.reader.barlineBreaks(this.score);
		this.connectorDrawer = new ConnectorDrawer(context, reader, {
			parts: this.parts,
			partGroups: this.partGroups,
			barlineBreaks,
			visibility: { showTabs: this.showTabs, showNotation: this.showNotation },
			totalStaves: this.totalStaves,
			labelIndent: this.labelIndent,
			partLabelIndent,
			labelFont,
			notationColor: this.notationColor,
			textColor: this.textColor,
		});
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
		this.decorations = barlineDecorations(
			reader,
			this.parts[0]?.measures ?? [],
		);
		this.systemTopY = layout.top + topSlack;
		this.systemContentBottom = this.systemTopY;
		this.collisionResolver = new CollisionResolver(
			new Rect(0, 0, width, scratchHeight),
		);
		this.lyricPlacer = new LyricPlacer(
			translator,
			context,
			this.collisionResolver,
			this.notationColor,
			{ lyricDrops: opts.lyricDrops },
		);
		this.scratchViewport = new Rect(0, 0, width, scratchHeight);
		this.directionPlacer = new DirectionPlacer(
			context,
			reader,
			this.collisionResolver,
			this.geometry,
			this.spill,
			// The pass's own bookkeeping, handed over as a narrow view: row resolution
			// reads the pending registry, and the crop bounds live here with the rest of
			// the page state.
			{
				rowOf: (stave) => this.rowOf(stave),
				recordAnnotationSpill: (stave, rect) =>
					this.recordAnnotationSpill(stave, rect),
				recordAnnotationDrop: (stave, rect) =>
					this.recordAnnotationDrop(stave, rect),
				growPageTop: (top) => {
					this.pageTop = Math.min(this.pageTop, top);
				},
				growPageBottom: (bottom) => {
					this.pageBottom = Math.max(this.pageBottom, bottom);
				},
			},
			{
				labelFont,
				notationFont,
				notationColor: this.notationColor,
				textColor: this.textColor,
				scratchViewport: this.scratchViewport,
			},
		);
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
			const staves = this.reader.visibleStaffNumbers(part, {
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
				if (
					this.directionPlacer.suppressesDynamic(
						`${partIndex}:${staffNumber}`,
						text,
						m,
					)
				) {
					continue;
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
			const symbol = this.reader.partSymbol(part, {
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
			this.connectorDrawer.drawCustomBarline(stave, this.connectorColumn());
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
			this.spill.growHighestTop(this.systemIndex, noteExtent.top);
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
					this.spill.growHighestTop(
						this.systemIndex,
						this.columnVoltaBase - lift,
					);
				}
			}
		}
		this.directionPlacer.placeColumn(this.directionColumn(m));
		this.connectorDrawer.drawConnectors(this.connectorColumn());
	}

	/* The measure loop's locals the direction placer reads, snapshotted at the call —
	 * see DirectionColumn for what each field means. */
	private directionColumn(m: number): DirectionColumn {
		return {
			measureIndex: m,
			systemIndex: this.systemIndex,
			topStave: this.systemTop,
			measure: this.parts[0]?.measures[m],
			repeatTimesLabel: this.decorations[m]?.repeatTimesLabel ?? null,
			words: this.wordsTasks,
			dynamics: this.dynamicsTasks,
			figuredBasses: this.figuredBassTasks,
			harmonies: this.harmonyTasks,
			tempos: this.tempoTasks,
		};
	}

	/* The measure loop's locals the connector drawer reads, snapshotted at the call —
	 * see ConnectorColumn for what each field means. */
	private connectorColumn(): ConnectorColumn {
		return {
			measureX: this.measureX,
			systemIndex: this.systemIndex,
			isSystemStart: this.isSystemStart,
			isLastMeasure: this.isLastMeasure,
			barStyle: this.barStyle,
			repeatEnd: this.decoration.repeatEnd,
			repeatBoth: this.repeatBoth,
			begRepeatX: this.begRepeatX,
			systemTop: this.systemTop,
			systemBottom: this.systemBottom,
			partStaves: this.partStaves,
		};
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
			this.spill.recordSystemTop(this.systemIndex, this.systemTopY);
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
		const isTab = this.reader.isTabStaff(part, staffNumber);
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
				this.reader.partSymbol(part, {
					showTabs: this.showTabs,
					showNotation: this.showNotation,
				}) === 'bracket') ||
				this.reader.partsPairTabWithNotation(this.parts, {
					showTabs: this.showTabs,
					showNotation: this.showNotation,
				}) ||
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
			this.spill.growDecorationTop(this.systemIndex, rect.y);
			this.pageTop = Math.min(this.pageTop, rect.y);
			this.spill.growHighestTop(this.systemIndex, rect.y);
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
		this.spill.seedRow(this.systemIndex, this.staveRow, stave);
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
					this.reader.stringTuning(part, staffNumber),
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
		// rest of the system needs arrives from the previous pass (see LyricPlacer);
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
			this.lyricPlacer.recordDrop(this.systemIndex, p.row, drop);
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
			this.lyricPlacer.pin(
				p.staveNotes,
				p.row,
				p.stave.getBottomLineY() +
					Math.max(
						lyricDrops.get(p.row) ?? LYRIC_Y_OFFSET,
						this.lyricPlacer.carriedDrop(this.systemIndex, p.row),
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
				this.connectorDrawer.paintBarStyle(p.stave, note.getAbsoluteX(), style);
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
	 * Called after format and before draw, like LyricPlacer.pin — the notes' x/y are final by then
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
					// Pin the ink the same way LyricPlacer.pin does — a mark drawn inside a colored
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
				this.geometry.collectTabNotes(m, p.stave as TabStave, [
					...p.tabChords,
					...p.graceTabChords,
				]);
			} else {
				this.geometry.collectStaveNotes(m, [...p.noteChords, ...p.graceChords]);
			}
		}
		if (this.systemTop && this.systemBottom) {
			// The box spans the staff column, then grows to enclose whatever escapes it: notes
			// that rise above the top staff line (contentTop) and, at a system start, the stave
			// connector, which draws left of the staves and (for a bracket) overhangs them top
			// and bottom. Otherwise a high note or the bracket clips out of the measure's box —
			// and the playback cursor that rides it. contentTop is Infinity when the measure has
			// no notes, so it never shrinks the box.
			const connector = this.connectorDrawer.connectorExtent(
				this.connectorColumn(),
			);
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
			this.geometry.addMeasure({
				rect: new Rect(left, top, right - left, Math.max(0, bottom - top)),
				index: m,
				number: this.parts[0]?.measures[m]?.number ?? String(m + 1),
				systemIndex: this.systemIndex,
			});
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

		this.geometry.applyDecorationTops(this.spill);

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
				this.spill.growHighestTop(slurSystem, slur.top);
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
		// The <bracket>/<dashes> spans, with each endpoint resolved to its drawn note (or
		// left undefined when it sits on a hidden staff).
		this.directionPlacer.drawDirectionLines(
			this.directionLineSpans.map((span) => ({
				span,
				start: this.byLead.get(span.from),
				stop: this.byLead.get(span.to),
			})),
		);
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
				this.spill.growHighestTop(system, wedge.bounds.top);
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

		return {
			pageTop: this.pageTop,
			pageBottom: this.pageBottom,
			observedOverflow: this.spill.observedOverflow(),
			observedStaveSpill: this.spill.observedStaveSpill(),
			observedLyricDrops: this.lyricPlacer.observedDrops(),
			lyricsStepped: this.lyricPlacer.stepped(),
			observedVoltaLifts: this.observedVoltaLifts,
			voltasLifted: [...this.observedVoltaLifts].some(
				([system, lift]) => lift !== (this.voltaLifts.get(system) ?? 0),
			),
			rawNotes: this.geometry.notes(),
			rawMeasures: this.geometry.measures(),
			rawChordDiagrams: this.geometry.chordDiagrams(),
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
			this.spill.growHighestTop(system, placed.y);
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
		this.spill.recordStave(this.systemOf(p.stave), p.row, p.stave, rect);
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
		this.spill.recordRise(this.systemOf(stave), row, stave, rect);
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
		this.spill.recordDrop(this.systemOf(stave), row, stave, rect);
	}

	/* Which system a stave belongs to. Registered once the stave's part is built; the
	 * fallback covers a caller still inside the measure loop that placed it, where the
	 * current system IS its system. Spanners resolved after the last measure (slurs,
	 * wedges) have no current system, so for them the map is the only right answer. */
	private systemOf(stave: Stave): number {
		return this.systemByStave.get(stave) ?? this.systemIndex;
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
}
