import type { Measure, Note, Part, Score } from '@stringsync/mdom';
import {
	Metrics,
	MetricsDefaults,
	type RenderContext,
	type Stave,
	StaveConnector,
	type StaveNote,
	type TabNote,
	type TabStave,
} from 'vexflow';
import { CollisionResolver } from './collision-resolver';
import type { Config, Gap } from './config';
import { type ConnectorColumn, ConnectorDrawer } from './connector-drawer';
import {
	BRACKET_X_SHIFT,
	GAP_LABEL_FONT_SIZE,
	LABEL_FONT_SIZE,
	LABEL_GAP,
	VOLTA_NOTE_CLEARANCE,
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
	type BarlineDecoration,
	NO_DECORATION,
	type NoteTranslator,
} from './note-translator';
import type {
	DirectionLineSpan,
	OctaveShiftSpan,
	PartGroup,
	ScoreReader,
} from './score-reader';
import type { SpannerBuilder } from './spanner-builder';
import { SpannerResolver } from './spanner-resolver';
import { SpillTracker, type StaveSpill } from './spill-tracker';
import { StaveBuilder, type StaveColumn } from './stave-builder';
import {
	type FormatColumn,
	type PendingStave,
	SystemFormatter,
} from './system-formatter';
import { VoiceBuilder } from './voice-builder';

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
	private readonly totalStaves: number;
	private readonly softmaxFactor: number;
	private readonly systemGap: number;
	private readonly labelIndent: number;
	// When false, tab staves are dropped — iterate visibleStaffNumbers, not staveCount.
	private readonly showTabs: boolean;
	// When false, notation staves are dropped the same way tab staves are.
	private readonly showNotation: boolean;
	/* score.parts rebuilds its array on every read, so hold it once. */
	private readonly parts: Part[];
	// Document measure index -> the gap spec rendered there (empty when config has none).
	private readonly gaps: ReadonlyMap<number, Gap>;
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

	// The same arrangement for tablature staves: hammer-ons/pull-offs also span
	// barlines, so TAB notes record into their own map and resolve at the end.
	private readonly byTabLead = new Map<Note, TabNote>();

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
	// Number is printed once per measure, above the system's top stave only.
	private measureNumbered = false;
	private systemY = 0;
	private staveRow = 0;
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
	// Builds each measure column's staves — clef/key/time, barlines, and the repeat, volta
	// and measure-number furniture. Fed the measure loop's locals through staveColumn().
	private readonly staveBuilder: StaveBuilder;
	// Translates each staff's mdom voices into the vexflow voices the formatter consumes,
	// filling byLead/byTabLead as the notes are built; a part's cross-staff beams are built
	// once all of its staves are pending.
	private readonly voiceBuilder: VoiceBuilder;
	// Justifies and draws each completed measure column's pending staves. Fed the measure
	// loop's locals through formatColumn().
	private readonly systemFormatter: SystemFormatter;
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
	// The per-note octave offset the score's <octave-shift> spans imply. Fixed for the
	// score; filled in the constructor (the spans themselves go to the spanner resolver).
	private readonly octaveShiftByNote = new Map<Note, number>();
	// The whole-score spanners — ties, slurs, wedges, pedals, ottava brackets and friends —
	// recorded into during the measure loop and resolved once after the last measure, when
	// every note is placed.
	private readonly spannerResolver: SpannerResolver;
	// Measured on the previous pass and reserved on this one; empty on the first pass.
	private readonly voltaLifts: Map<number, number>;

	constructor(
		private readonly translator: NoteTranslator,
		private readonly reader: ScoreReader,
		readonly spanners: SpannerBuilder,
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
		this.totalStaves = totalStaves;
		this.softmaxFactor = softmaxFactor;
		this.systemGap = systemGap;
		this.labelIndent = labelIndent;
		const { measureNumbering, showTabSlideText } = config;
		this.showTabs = config.showTabs;
		this.showNotation = config.showNotation;
		this.notationColor = config.fonts.notation?.color ?? '#000000';
		this.textColor = config.fonts.text?.color ?? '#000000';
		this.parts = this.score.parts;
		this.gaps = configuredGaps.byMeasureIndex();
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
		const octaveShiftSpans: OctaveShiftSpan[] = [];
		const directionLineSpans: DirectionLineSpan[] = [];
		for (const part of this.parts) {
			for (const span of this.reader.octaveShiftsOf(part)) {
				octaveShiftSpans.push(span);
				for (const note of span.notes) {
					this.octaveShiftByNote.set(note, span.octaves);
				}
			}
			directionLineSpans.push(...this.reader.directionLinesOf(part));
		}
		// Read from the first part — a repeat or volta boundary applies across the system.
		this.decorations = translator.barlineDecorations(
			reader.measureRepeats(this.parts[0]?.measures ?? []),
		);
		this.systemTopY = layout.top + topSlack;
		this.systemContentBottom = this.systemTopY;
		this.collisionResolver = new CollisionResolver(
			new Rect(0, 0, width, scratchHeight),
		);
		this.staveBuilder = new StaveBuilder(
			translator,
			reader,
			context,
			this.collisionResolver,
			this.spill,
			configuredGaps,
			{
				parts: this.parts,
				partGroups: this.partGroups,
				visibility: {
					showTabs: this.showTabs,
					showNotation: this.showNotation,
				},
				totalStaves: this.totalStaves,
				measureNumbering,
				textColor: this.textColor,
				staveOffsets,
				systemStaveOffsets,
				voltaLifts: this.voltaLifts,
			},
		);
		this.lyricPlacer = new LyricPlacer(
			translator,
			context,
			this.collisionResolver,
			this.notationColor,
			{ lyricDrops: opts.lyricDrops },
		);
		this.voiceBuilder = new VoiceBuilder(translator, reader, spanners, {
			softmaxFactor: this.softmaxFactor,
			octaveShiftByNote: this.octaveShiftByNote,
			byLead: this.byLead,
			byTabLead: this.byTabLead,
		});
		this.systemFormatter = new SystemFormatter(
			context,
			translator,
			spanners,
			this.connectorDrawer,
			this.lyricPlacer,
			this.collisionResolver,
			this.spill,
			// The pass's own bookkeeping, handed over as a narrow view: the spill a note
			// measurement records is banded under the system its stave was registered on.
			{ systemOf: (stave) => this.systemOf(stave) },
			{
				softmaxFactor: this.softmaxFactor,
				notationColor: this.notationColor,
				byLead: this.byLead,
				crossStaveNotes: this.voiceBuilder.crossStaveNotes(),
			},
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
		this.spannerResolver = new SpannerResolver(
			context,
			spanners,
			translator,
			this.spill,
			this.directionPlacer,
			// The pass's own bookkeeping again, as a narrow view: the note obstacles come
			// from the note measurements the system formatter takes, and the crop bounds
			// live here with the rest of the page state.
			{
				noteObstacle: (note) => this.systemFormatter.noteRect(note),
				growPageTop: (top) => {
					this.pageTop = Math.min(this.pageTop, top);
				},
				growPageBottom: (bottom) => {
					this.pageBottom = Math.max(this.pageBottom, bottom);
				},
			},
			{
				octaveShiftSpans,
				directionLineSpans,
				showTabSlideText,
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
			this.voiceBuilder.buildPartBeams(this.pendingStaves);

			// Defer formatting to one pass over the whole system (below) so notes align
			// across parts, not just within this part.
			this.systemPending.push(...this.pendingStaves);
			for (const p of this.pendingStaves) {
				this.spannerResolver.registerStave(p.stave, p.row, this.systemIndex);
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
			// can span barlines) after every note is placed — see finishPass.
			this.spannerResolver.addPedals(this.reader.pedalsOf(measure));
			this.spannerResolver.addWedges(this.reader.wedgesOf(measure));

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
		this.begRepeatX = this.systemFormatter.alignBegModifiers(this.columnStaves);
		for (const stave of this.columnStaves) {
			stave.setContext(this.context).draw();
			this.connectorDrawer.drawCustomBarline(stave, this.connectorColumn());
		}
		// The consolidated multi-bar rests, over the staves that just landed — they paint
		// onto staff lines, so the staves have to be on the canvas first.
		for (const { stave, count } of this.columnMultiRests) {
			this.staveBuilder.drawMultiRest(stave, count);
		}

		// Format and draw every part's staves together so same-tick notes line up
		// vertically across the whole system (notation over its own tab, and across
		// separate parts that share a beat).
		const noteExtent = this.systemFormatter.formatAndDraw(
			this.systemPending,
			this.formatColumn(),
		);
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

	/* The measure loop's locals the system formatter reads, snapshotted at the call —
	 * see FormatColumn for what each field means. */
	private formatColumn(): FormatColumn {
		return {
			systemIndex: this.systemIndex,
			measureLeadingPad: this.measureLeadingPad,
			measureTrailingPad: this.measureTrailingPad,
		};
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

	/* The measure loop's locals the stave builder reads, snapshotted at the call —
	 * see StaveColumn for what each field means. */
	private staveColumn(m: number): StaveColumn {
		const nextBox = this.boxes[m + 1];
		return {
			measureIndex: m,
			measureX: this.measureX,
			measureWidth: this.measureWidth,
			systemIndex: this.systemIndex,
			systemY: this.systemY,
			staveRow: this.staveRow,
			isSystemStart: this.isSystemStart,
			isLastMeasure: this.isLastMeasure,
			barStyle: this.barStyle,
			decoration: this.decoration,
			repeatBoth: this.repeatBoth,
			suppressBegRepeat: this.suppressBegRepeat,
			measureNumbered: this.measureNumbered,
			nextVolta:
				nextBox &&
				nextBox.systemIndex === this.systemIndex &&
				this.decorations[m + 1]?.volta
					? { x: nextBox.x, width: nextBox.width }
					: null,
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
	 * (clef/key/time/barlines), queue it for the column draw, and queue its notes for the
	 * system format. `visibleCount` is how many staves the part renders (tab/notation
	 * staves may be hidden).
	 */
	private buildStave(
		part: Part,
		measure: Measure,
		m: number,
		staffNumber: string,
		visibleCount: number,
	): Stave {
		const built = this.staveBuilder.build(
			part,
			measure,
			staffNumber,
			visibleCount,
			this.staveColumn(m),
		);
		const { stave } = built;
		// Queued, not drawn: the column's staves are drawn together once they all exist, so a
		// repeat sign can be aligned across them first (see SystemFormatter.alignBegModifiers).
		this.columnStaves.push(stave);
		if (built.volta) {
			this.columnVoltaBase = built.volta.base;
			// The bracket is the highest ink in this column, so it grows the page crop.
			this.pageTop = Math.min(this.pageTop, built.volta.top);
		}
		if (built.numbered) {
			this.measureNumbered = true;
		}
		const staveBottom = stave.getBottomY();
		this.pageBottom = Math.max(this.pageBottom, staveBottom);
		this.systemContentBottom = Math.max(this.systemContentBottom, staveBottom);

		// Build this staff's notes; they're formatted and drawn together with the
		// rest of the part's staves below. A TAB stave builds fretted TabNotes;
		// everything else uses the notation path. An empty voice (no chords) would
		// crash the formatter, so it's filtered.
		// A <multiple-rest> lead draws the consolidated bar in place of its own contents — the
		// whole rest it holds stands for the run and would otherwise print on top of the bar.
		if (built.multiRestCount) {
			this.columnMultiRests.push({ stave, count: built.multiRestCount });
			this.systemTop ??= stave;
			this.systemBottom = stave;
			this.staveRow++;
			return stave;
		}

		const voices = this.reader.staffVoices(measure.voices, staffNumber);
		if (built.isTab && voices.length > 0) {
			this.pendingStaves.push(
				this.voiceBuilder.buildTabNotes(
					stave as TabStave,
					this.staveRow,
					voices,
					this.reader.stringTuning(part, staffNumber),
				),
			);
			for (const voice of voices) {
				this.spannerResolver.addTabChords(voice.chords);
			}
		} else if (voices.length > 0) {
			const clef = measure.getClef(staffNumber);
			const clefName = clef
				? this.translator.vexflowClef(clef.sign, clef.line)
				: 'treble';
			this.pendingStaves.push(
				this.voiceBuilder.buildNotes(stave, this.staveRow, voices, clefName, {
					meterFloor: this.reader.meterFloor(measure, staffNumber),
					clefOctaveShift: clef?.octaveChange ?? 0,
					barlines: this.reader.midBarlinesOf(measure),
					midClefs: this.translator.midClefSpecs(
						this.reader.midClefsOf(measure, staffNumber),
					),
				}),
			);
			for (const voice of voices) {
				this.spannerResolver.addChords(voice.chords);
			}
		}

		this.systemTop ??= stave;
		this.systemBottom = stave;
		this.staveRow++;
		return stave;
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

		// Every note is placed now, so the whole-score spanners can finally find both of
		// their endpoints and draw — last, on top of the notes.
		this.spannerResolver.resolve({
			byLead: this.byLead,
			byTabLead: this.byTabLead,
		});

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

	/* Which system a stave belongs to, read off the spanner resolver's registry. The
	 * fallback covers a caller still inside the measure loop that placed the stave, where
	 * the current system IS its system. */
	private systemOf(stave: Stave): number {
		return this.spannerResolver.systemOf(stave) ?? this.systemIndex;
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
