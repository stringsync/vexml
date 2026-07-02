import type {
	Chord,
	MElement,
	Measure,
	Note,
	Part,
	Voice as ScoreVoice,
	Time,
} from '@stringsync/mdom';
import {
	Barline,
	Bend,
	Formatter,
	GhostNote,
	GraceNoteGroup,
	Modifier,
	type RenderContext,
	Stave,
	StaveConnector,
	type StaveNote,
	StaveTempo,
	Stem,
	type StemmableNote,
	type TabNote,
	TabStave,
	Vibrato,
	type Voice,
} from 'vexflow';
import type { Config, Gap, MeasureNumbering } from '../config';
import {
	BRACE_LEFT_OVERHANG,
	BRACKET_GLYPH_OVERHANG,
	BRACKET_X_SHIFT,
	CHORD_DIAGRAM_GAP,
	CHORD_DIAGRAM_HEIGHT,
	CHORD_DIAGRAM_PADDING,
	CHORD_DIAGRAM_WIDTH,
	CONNECTOR_VERTICAL_OVERHANG,
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
	NOTEHEAD_HALF_H,
	PAGE_MARGIN_X,
	PEDAL_BOTTOM_MARGIN,
	PEDAL_BOTTOM_TEXT_LINE,
	TEMPO_NOTE_CLEARANCE,
	TEMPO_SCALE,
	TIE_APEX_RISE,
	WORDS_FONT_SIZE,
	WORDS_NOTE_CLEARANCE,
	WORDS_Y_OFFSET,
} from '../constants';
import { gapsByMeasureIndex } from '../gaps';
import { Rect } from '../geometry';
import { ChordDiagramGlyph, type ChordFrame } from './chord-diagram-glyph';
import { type CollisionKind, CollisionResolver } from './collision-resolver';
import type { MeasureBox, ScoreLayout } from './layout-planner';
import { findModifier, type NoteTranslator } from './note-translator';
import type { RawChordDiagram, RawMeasure, RawNote } from './score-drawer';
import type { PedalMark, ScoreReader, TempoMark } from './score-reader';
import type { SpannerBuilder } from './spanner-builder';
import { visibleStaffNumbers } from './staves';

/*
 * MusicXML <time> -> vexflow time-signature spec: 'C' (common), 'C|' (cut), or
 * "beats/beat-type". null when there's nothing drawable. Doubles as the equality
 * key for detecting a mid-piece meter change.
 */
function timeSignatureSpec(time: Time | null): string | null {
	if (time?.symbol === 'common') {
		return 'C';
	}
	if (time?.symbol === 'cut') {
		return 'C|';
	}
	if (time?.beats && time?.beatType) {
		return `${time.beats}/${time.beatType}`;
	}
	return null;
}

/*
 * True when the part stacks a TAB stave with at least one non-TAB (notation) stave —
 * the guitar notation+tab pairing, which is bracketed rather than braced by convention.
 */
function pairsTabWithNotation(
	part: Part,
	showTabs: boolean,
	showNotation: boolean,
): boolean {
	// A notation+tab pairing needs both kinds on screen; hide either and it can't pair.
	if (!showTabs || !showNotation) {
		return false;
	}
	const measure = part.measures[0];
	if (!measure) {
		return false;
	}
	const signs: string[] = [];
	for (let staff = 1; staff <= part.staveCount; staff++) {
		const sign = measure.getClef(String(staff))?.sign;
		if (sign) {
			signs.push(sign);
		}
	}
	return signs.includes('TAB') && signs.some((sign) => sign !== 'TAB');
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
	const signs: string[] = [];
	for (const part of parts) {
		const measure = part.measures[0];
		if (!measure) {
			continue;
		}
		for (let staff = 1; staff <= Math.max(part.staveCount, 1); staff++) {
			const sign = measure.getClef(String(staff))?.sign;
			if (sign) {
				signs.push(sign);
			}
		}
	}
	return signs.includes('TAB') && signs.some((sign) => sign !== 'TAB');
}

/*
 * The stave connector that joins a multi-staff part's own staves. An explicit
 * <part-symbol> in any measure's attributes wins: bracket, none (no connector), or
 * brace (the MusicXML default; line/square fall back to it). With none declared, a
 * guitar notation+tab pair brackets by convention and everything else (piano grand
 * staves, …) braces.
 */
function partSymbol(
	part: Part,
	showTabs: boolean,
	showNotation: boolean,
): 'brace' | 'bracket' | null {
	const symbol = part.partSymbol;
	if (symbol === null) {
		return pairsTabWithNotation(part, showTabs, showNotation)
			? 'bracket'
			: 'brace';
	}
	if (symbol === 'none') {
		return null;
	}
	return symbol === 'bracket' ? 'bracket' : 'brace';
}

// One stave's notes, built but not yet formatted or drawn. A part's staves are
// formatted together (see formatAndDrawSystem) so notes at the same tick line up
// vertically across staves, so the build (voice/spanner construction) is split from
// the format+draw step.
type PendingStave = {
	stave: Stave;
	isTab: boolean;
	vexVoices: Voice[];
	beams: ReturnType<SpannerBuilder['buildBeams']>;
	tuplets: ReturnType<SpannerBuilder['buildTuplets']>;
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
};

// Above-stave text (chord symbols, words) clears notes, ties, and other placed text, but NOT
// chord diagrams — a diagram deliberately draws on top of any text it shares a spot with. All
// nudge logic funnels through the CollisionResolver; see docs/collision-audit.md.
const TEXT_CLEAR_KINDS: CollisionKind[] = ['note', 'tie', 'annotation'];

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
	private readonly totalStaves: number;
	private readonly softmaxFactor: number;
	private readonly systemGap: number;
	private readonly labelIndent: number;
	private readonly measureNumbering: MeasureNumbering;
	private readonly showTabHammerPullText: boolean;
	private readonly showTabSlideText: boolean;
	// When false, tab staves are dropped — iterate visibleStaffNumbers, not staveCount.
	private readonly showTabs: boolean;
	// When false, notation staves are dropped the same way tab staves are.
	private readonly showNotation: boolean;
	// Document measure index -> the gap spec rendered there (empty when config has none).
	private readonly gaps: ReadonlyMap<number, Gap>;

	// One note map for the whole score: ties and slurs can span a barline, so their
	// two endpoints may live in different measures. Notes are drawn measure by
	// measure (recording into this map); the spanners are resolved once at the end.
	private readonly byLead = new Map<Note, StaveNote>();
	private readonly allChords: Chord[] = [];
	// Pedal directions are spanners too (a start..stop pair), collected per measure
	// and resolved over the whole score alongside ties and slurs.
	private readonly allPedals: PedalMark[] = [];

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

	// Per-measure-column state: the measure loop's locals, shared by the methods cut
	// out of it below. Reset at the top of drawMeasureColumn (per-part fields in its
	// part loop) exactly where the original loop declared them.
	private measureX = 0;
	private measureWidth = 0;
	private systemIndex = 0;
	private isSystemStart = false;
	private isLastMeasure = false;
	private isLightLight = false;
	private showMeasureNumber = false;
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
	private tempoTasks: Array<{
		stave: Stave;
		tempo: TempoMark;
		firstNote: StaveNote | undefined;
	}> = [];
	// Chord symbols, drawn after the system is formatted so each sits at its
	// note's laid-out x.
	private harmonyTasks: Array<{
		staveNote: StaveNote;
		text: string;
		frame: ChordFrame | null;
		source: MElement;
	}> = [];
	// Words directions (e.g. "ritardando"), each drawn above its part's top stave at
	// the first note's laid-out x.
	private wordsTasks: Array<{
		stave: Stave;
		text: string;
		firstNote: StaveNote | undefined;
	}> = [];
	// A part's staves are built here, then formatted and drawn together below so
	// notes at the same tick align vertically across staves (notation over tab).
	private pendingStaves: PendingStave[] = [];

	constructor(
		private readonly translator: NoteTranslator,
		private readonly reader: ScoreReader,
		private readonly spanners: SpannerBuilder,
		config: Config,
		private readonly context: RenderContext,
		private readonly parts: Part[],
		layout: ScoreLayout,
		private readonly labelFont: string,
		topSlack: number,
		scratchHeight: number,
		private readonly topOverflow: Map<number, number>,
	) {
		const {
			measureCount,
			boxes,
			staveOffsets,
			totalStaves,
			softmaxFactor,
			systemGap,
			width,
			labelIndent,
		} = layout;
		this.measureCount = measureCount;
		this.boxes = boxes;
		this.staveOffsets = staveOffsets;
		this.totalStaves = totalStaves;
		this.softmaxFactor = softmaxFactor;
		this.systemGap = systemGap;
		this.labelIndent = labelIndent;
		const { measureNumbering, showTabHammerPullText, showTabSlideText } =
			config;
		this.measureNumbering = measureNumbering;
		this.showTabHammerPullText = showTabHammerPullText;
		this.showTabSlideText = showTabSlideText;
		this.showTabs = config.showTabs;
		this.showNotation = config.showNotation;
		this.gaps = gapsByMeasureIndex(config.gaps);
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
		rawNotes: RawNote[];
		rawMeasures: RawMeasure[];
		rawChordDiagrams: RawChordDiagram[];
	} {
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
		this.systemIndex = box.systemIndex;
		this.isSystemStart = box.isSystemStart;
		this.isLastMeasure = m === this.measureCount - 1;
		// An explicit right <barline> with <bar-style>light-light</bar-style> draws a thin
		// double line at this measure's end instead of the default single divider (or, on
		// the final measure, the thin-thick end). Read from the first part — a light-light
		// boundary applies across the system.
		this.isLightLight =
			this.parts[0]?.measures[m]?.barlines.find((b) => b.location === 'right')
				?.barStyle === 'light-light';
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
		this.tempoTasks = [];
		this.harmonyTasks = [];
		this.wordsTasks = [];

		for (const part of this.parts) {
			// The staves this part actually renders: with showTabs/showNotation off, its
			// tab/notation staves are dropped. staveRow indexes into staveOffsets, which the
			// layout planner built from this same visible set, so the two stay aligned.
			const staves = visibleStaffNumbers(
				part,
				this.showTabs,
				this.showNotation,
			);
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

			// Defer formatting to one pass over the whole system (below) so notes align
			// across parts, not just within this part.
			this.systemPending.push(...this.pendingStaves);

			// Chord symbols from this measure's <harmony> elements, each bound to the
			// lead note it sits above. Resolved via byLead (the notation staff's notes);
			// a harmony over a tab-only note isn't drawn.
			for (const { lead, text, frame, source } of this.reader.harmoniesOf(
				measure,
			)) {
				const staveNote = this.byLead.get(lead);
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
			const tempo = this.reader.tempoOf(measure);
			const topStave = this.pendingStaves[0];
			if (tempo && topStave) {
				this.tempoTasks.push({
					stave: topStave.stave,
					tempo,
					firstNote: topStave.staveNotes[0],
				});
			}

			// Words directions (e.g. "ritardando") print on this part's top staff, like
			// the metronome mark. Drawn after the system is formatted so the first note's
			// x is real.
			if (topStave) {
				for (const text of this.reader.wordsOf(measure)) {
					this.wordsTasks.push({
						stave: topStave.stave,
						text,
						firstNote: topStave.staveNotes[0],
					});
				}
			}

			// Pedal markers, resolved into PedalMarkings over the whole score (a pedal
			// can span barlines) after every note is placed — see below the measure loop.
			this.allPedals.push(...this.reader.pedalsOf(measure));

			// A part's own staves are joined at each system start by the symbol named in
			// <part-symbol> (brace by default; bracket for guitar notation+tab pairs).
			// 'none' suppresses the connector entirely.
			const symbol = partSymbol(part, this.showTabs, this.showNotation);
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
		const staveY = this.systemY + (this.staveOffsets[this.staveRow] ?? 0);

		// A TAB clef draws on a TabStave whose line count matches the
		// instrument's strings (<staff-lines>: 6 for guitar, 4 for bass).
		const isTab = clef?.sign === 'TAB';
		const tabLines = isTab ? measure.getStaveLines(staffNumber) : 0;
		const stave = isTab
			? new TabStave(this.measureX, staveY, this.measureWidth, {
					numLines: tabLines,
				})
			: new Stave(this.measureX, staveY, this.measureWidth);
		// Only draw the end barline. Each measure's end barline is the same line
		// as the next measure's left edge, so internal measures still get a divider;
		// only the first measure of a system loses its left barline (intended). The
		// final measure of the piece closes with a thin-thick end barline.
		// When the system has multiple staves, the per-measure stave connector
		// already draws this line across the staves, so the per-stave end barline
		// is suppressed to avoid doubling it.
		// Exception: a lone TAB stave has no system connector to close its left
		// edge, so its system-start measure draws an explicit begin barline.
		stave.setBegBarType(
			isTab && this.totalStaves === 1 && this.isSystemStart
				? Barline.type.SINGLE
				: Barline.type.NONE,
		);
		stave.setEndBarType(
			this.totalStaves > 1
				? Barline.type.NONE
				: this.isLightLight
					? Barline.type.DOUBLE
					: this.isLastMeasure
						? Barline.type.END
						: Barline.type.SINGLE,
		);

		// The previous measure's effective signatures (carried forward), used to
		// spot a mid-system change. getKey/getTime return what's in effect at the
		// measure start, so M3 of a piece that changed key at M2 reads the same
		// key as M2 — no spurious redraw.
		const prevMeasure = part.measures[m - 1];
		const key = measure.getKey(staffNumber);
		const keyChanged =
			(key?.rootNote ?? null) !==
			(prevMeasure?.getKey(staffNumber)?.rootNote ?? null);

		// Clef and key print at every system start (re-stated on each new line).
		// A mid-system key change is also redrawn where it happens (clef and time
		// are not repeated for it).
		if (this.isSystemStart) {
			if (isTab) {
				const tabStave = stave as TabStave;
				tabStave.addTabGlyph();
				this.resizeTabClef(tabStave, tabLines);
			} else if (clef) {
				stave.addClef(this.translator.vexflowClef(clef.sign, clef.line));
			}
			// Tab staves carry no key signature.
			if (key?.rootNote && !isTab) {
				stave.addKeySignature(key.rootNote);
			}
		} else if (key?.rootNote && keyChanged && !isTab) {
			stave.addKeySignature(key.rootNote);
		}

		// Unlike clef and key, the time signature is not re-stated at every
		// system start — only at the piece start and wherever the meter changes
		// (a change that lands on a system break still redraws here).
		const timeSpec = timeSignatureSpec(measure.getTime(staffNumber));
		const prevTimeSpec = timeSignatureSpec(
			prevMeasure?.getTime(staffNumber) ?? null,
		);
		if (timeSpec && !isTab && (m === 0 || timeSpec !== prevTimeSpec)) {
			stave.addTimeSignature(timeSpec);
		}

		// A bracket (drawn below) has a top curl that sits where vexflow's
		// setMeasure centers the measure number, so the number gets occluded — true
		// both for a multi-stave part's own bracket and for the system bracket of a
		// notation+tab pair split across parts. Only for a bracket do we draw the
		// number ourselves, left-aligned just right of the barline and lifted above
		// the curl; the curly brace doesn't reach that high, so it keeps vexflow's
		// placement. The number prints once (measureNumbered), on the top stave.
		const numberOccluded =
			this.isSystemStart &&
			((visibleCount > 1 &&
				partSymbol(part, this.showTabs, this.showNotation) === 'bracket') ||
				partsPairTabWithNotation(this.parts, this.showTabs, this.showNotation));
		if (this.showMeasureNumber && !this.measureNumbered && !numberOccluded) {
			stave.setMeasure(Number(measure.number));
			this.measureNumbered = true;
		}

		stave.setContext(this.context).draw();

		if (this.showMeasureNumber && !this.measureNumbered && numberOccluded) {
			this.context.save();
			this.context.setFont(stave.getFont());
			this.context.setFillStyle('#000000');
			this.context.fillText(
				measure.number,
				stave.getX() + 4,
				stave.getYForTopText(0) - 14,
			);
			this.context.restore();
			this.measureNumbered = true;
		}
		const staveBottom = stave.getBottomY();
		this.pageBottom = Math.max(this.pageBottom, staveBottom);
		this.systemContentBottom = Math.max(this.systemContentBottom, staveBottom);

		// Build this staff's notes; they're formatted and drawn together with the
		// rest of the part's staves below. A TAB stave builds fretted TabNotes;
		// everything else uses the notation path. An empty voice (no chords) would
		// crash the formatter, so it's filtered.
		const voices = this.reader.staffVoices(measure.voices, staffNumber);
		if (isTab && voices.length > 0) {
			this.pendingStaves.push(this.buildTabNotes(stave as TabStave, voices));
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
					voices,
					clefName,
					this.reader.meterBeats(measure.getTime(staffNumber)),
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
		voices: ScoreVoice[],
		clef: string,
		meterFloor: number,
	): PendingStave {
		// Floor the run-out beat at the meter so an underfull measure pads trailing
		// ghosts instead of jamming its last note against the end barline.
		const endBeat = Math.max(this.reader.endBeatOf(voices), meterFloor);
		const staveNotes: StaveNote[] = [];
		const tiedNotes = new Set<StaveNote>();
		const noteChords: Array<{ note: StaveNote; chord: Chord }> = [];
		const graceChords: Array<{ note: StaveNote; chord: Chord }> = [];
		const vexVoices = voices.map((voice) => {
			const chords = voice.chords;
			// lead note -> its chord, so the record callback (which only gets the lead) can pair
			// each StaveNote with the chord whose noteheads it draws (for the hit index).
			const chordByLead = new Map<Note, Chord>();
			for (const chord of chords) {
				chordByLead.set(chord.lead, chord);
			}
			const tickables = this.translator.vexflowVoiceTickables(
				chords,
				clef,
				endBeat,
				(lead, note) => {
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
			);
			return this.translator.softVoice(tickables, this.softmaxFactor);
		});

		// Spanners that mutate notes (beams drop flags, tuplets rescale ticks) must be
		// built before formatting.
		const beams = this.spanners.buildBeams(
			voices.flatMap((v) => this.spanners.groupBeams(v.chords)),
			this.byLead,
		);
		const tuplets = voices.flatMap((v) =>
			this.spanners.buildTuplets(v.chords, this.byLead),
		);

		return {
			stave,
			isTab: false,
			vexVoices,
			beams,
			tuplets,
			staveNotes,
			tiedNotes,
			noteChords,
			graceChords,
			tabChords: [],
			graceTabChords: [],
		};
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
	private buildTabNotes(stave: TabStave, voices: ScoreVoice[]): PendingStave {
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
				this.translator.vexflowTabTickables(chords, (lead, tickable) => {
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
				}),
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
			isTab: true,
			vexVoices,
			beams: [],
			tuplets: [],
			staveNotes: [],
			tiedNotes: new Set(),
			noteChords: [],
			graceChords: [],
			tabChords,
			graceTabChords,
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

		const startX = Math.max(...pending.map((p) => p.stave.getNoteStartX()));
		let noteEndX = 0;
		for (const p of pending) {
			p.stave.setNoteStartX(startX);
			noteEndX = p.stave.getNoteEndX();
			for (const vexVoice of p.vexVoices) {
				vexVoice.setStave(p.stave);
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
		const justifyWidth = noteEndX - startX - Stave.defaultPadding;
		formatter.format(allVoices, justifyWidth, { context: this.context });

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
			for (const vexVoice of p.vexVoices) {
				vexVoice.draw(this.context, p.stave);
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
				top = Math.min(top, this.noteTop(note));
				// Register each note as a collision obstacle now that its position is final, so the
				// above-stave annotations drawn next can be nudged clear of it (and of high ties).
				this.collisionResolver.add({ rect: this.noteRect(note), kind: 'note' });
				if (p.tiedNotes.has(note) && note.getStemDirection() === Stem.DOWN) {
					this.collisionResolver.add({
						rect: this.tieApexRect(note),
						kind: 'tie',
					});
				}
			}
		}
		return { top, bottom };
	}

	/*
	 * The highest y a single note reaches: its top notehead, and — when it has a stem —
	 * the stem tip, which a beam extends up to its beam line. Excludes modifiers on
	 * purpose (see formatAndDrawSystem). Falls back to the notehead bound if the stem
	 * extents aren't available (e.g. a stemless whole note).
	 */
	private noteTop(note: StaveNote): number {
		let top = note.getNoteHeadBounds().yTop;
		if (note.getStem()) {
			const { topY, baseY } = note.getStemExtents();
			top = Math.min(top, topY, baseY);
		}
		// Clear articulations sitting above the notehead too (e.g. a staccato dot on a
		// stem-down note). They're drawn before the harmony/words/tempo pass, so their
		// bounding box is final; the notehead and stem alone miss them, which would let a
		// chord symbol land on the dot. Only above-side marks raise the top — below-side
		// ones (stem-up notes) don't.
		for (const mod of note.getModifiers()) {
			if (
				mod.getCategory() === 'Articulation' &&
				mod.getPosition() === Modifier.Position.ABOVE
			) {
				top = Math.min(top, mod.getBoundingBox().getY());
			}
		}
		return top;
	}

	/*
	 * The collision obstacle for a note: a box from its top (noteTop — notehead ∪ beam-extended
	 * stem tip ∪ above articulations) down to its bottom notehead, one notehead wide, centered on
	 * its laid-out x. Deliberately built from noteTop/getNoteHeadBounds, NOT note.getBoundingBox()
	 * (which unions attached modifiers and reports a bogus near-origin y for grace groups).
	 */
	private noteRect(note: StaveNote): Rect {
		const top = this.noteTop(note);
		const bottom = note.getNoteHeadBounds().yBottom;
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
				visibleStaffNumbers(part, this.showTabs, this.showNotation).length <= 1
			) {
				continue;
			}
			const symbol = partSymbol(part, this.showTabs, this.showNotation);
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
	 * formatted so every anchor x is real: tempo marks, then words, then chord
	 * symbols/diagrams.
	 */
	private drawAnnotations(m: number): void {
		for (const t of this.tempoTasks) {
			this.drawTempo(t.stave, t.tempo, t.firstNote);
		}
		// Words go before the diagrams so a chord diagram draws on top of any words it
		// shares a measure with — the fret box stays fully legible, the text yields.
		for (const w of this.wordsTasks) {
			const top = this.drawWords(w.stave, w.text, w.firstNote);
			this.pageTop = Math.min(this.pageTop, top);
			this.growDecorationTop(this.systemIndex, top);
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
				const spaced = this.collisionResolver.pushRightOf(
					natural,
					'diagram',
					CHORD_DIAGRAM_GAP,
				);
				// Pad the box below its bottom so the lift-clear probe reaches a high note
				// (or its tie) poking up into the box's column — the same padding treatment
				// a chord symbol uses. The box then rises off the note instead of overlapping
				// it; with nothing in the way it keeps its default position.
				const padded = new Rect(
					spaced.x,
					spaced.y,
					spaced.w,
					CHORD_DIAGRAM_HEIGHT + CHORD_DIAGRAM_PADDING,
				);
				const lifted = this.collisionResolver.liftClear(
					padded,
					CHORD_DIAGRAM_GAP,
					TEXT_CLEAR_KINDS,
				);
				// Recover the real (unpadded) box; the padding only extended the probe.
				const unclamped = new Rect(
					lifted.x,
					lifted.y,
					CHORD_DIAGRAM_WIDTH,
					CHORD_DIAGRAM_HEIGHT,
				);
				// A box anchored at a note near the right edge would overrun the canvas and be
				// clipped (page overflow has no crop-growth knob like the vertical edges do), so
				// nudge it back inside the drawable region.
				const placed = this.collisionResolver.nudgeInsideX(
					unclamped,
					this.scratchViewport,
					PAGE_MARGIN_X,
				);
				this.collisionResolver.add({ rect: placed, kind: 'diagram' });
				const diagram = new ChordDiagramGlyph(placed.x, placed.y, {
					...h.frame,
					title: h.text || undefined,
					width: CHORD_DIAGRAM_WIDTH,
					height: CHORD_DIAGRAM_HEIGHT,
					stringCount: h.frame.chord.length,
					fretCount: Math.max(4, ...frets),
					showTuning: false,
					fontFamily: this.labelFont,
				});
				diagram.draw(this.context);
				this.pageTop = Math.min(this.pageTop, diagram.top);
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
	}

	/*
	 * Draw a metronome mark ("<note> = bpm") above the stave, anchored just right of the
	 * clef/key/time (StaveTempo's own placement, over the first note). It normally sits
	 * one text line above the staff; if the first note reaches up into that band (a high
	 * note with ledger lines), lift the mark with a negative y-shift so its bottom clears
	 * the notehead — the layout reserves the matching top headroom. Drawn after the notes
	 * are formatted so firstNote's extents are real. Uses noteTop, not the bounding box: an
	 * attached grace-note group makes the box report a bogus near-origin y.
	 */
	private drawTempo(
		stave: Stave,
		tempo: TempoMark,
		firstNote: StaveNote | undefined,
	): void {
		const baseY = stave.getYForTopText(1);
		let shiftY = 0;
		if (firstNote) {
			const clearY = this.noteTop(firstNote) - TEMPO_NOTE_CLEARANCE;
			if (clearY < baseY) {
				shiftY = clearY - baseY;
			}
		}
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
		this.context.save();
		this.context.scale(TEMPO_SCALE, TEMPO_SCALE);
		new StaveTempo(
			{ duration: tempo.duration, bpm: tempo.bpm },
			targetX / TEMPO_SCALE - shiftX - 10,
			(baseY + shiftY) / TEMPO_SCALE - baseY,
		)
			.setStave(stave)
			.setPosition(position)
			.setContext(this.context)
			.draw();
		this.context.restore();
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
	private drawHarmony(staveNote: StaveNote, text: string): number {
		const stave = staveNote.getStave();
		if (!stave) {
			return Infinity;
		}
		const baseY = stave.getYForLine(0) - HARMONY_Y_OFFSET;
		this.context.save();
		this.context.setFillStyle('#000000');
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
		const placed = this.collisionResolver.liftClear(
			natural,
			HARMONY_NOTE_CLEARANCE,
			TEXT_CLEAR_KINDS,
		);
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
		this.collisionResolver.add({ rect: placed, kind: 'annotation' });
		return placed.y;
	}

	/*
	 * Draw a words direction (e.g. "ritardando") above the stave in italics, left-anchored at
	 * the first note's x — where the directive applies. The collision resolver lifts it clear of
	 * any notehead/tie/annotation it would land on; it sits at a fixed gap above the top staff
	 * line otherwise. Returns the y the text reaches up to so the caller can grow the page crop
	 * above it (like drawHarmony). Drawn after the notes are formatted so getAbsoluteX is real.
	 */
	private drawWords(
		stave: Stave,
		text: string,
		firstNote: StaveNote | undefined,
	): number {
		const baseY = stave.getYForLine(0) - WORDS_Y_OFFSET;
		const x = firstNote ? firstNote.getAbsoluteX() : stave.getNoteStartX();
		this.context.save();
		this.context.setFont(this.labelFont, WORDS_FONT_SIZE, 'normal', 'italic');
		this.context.setFillStyle('#000000');
		const natural = new Rect(
			x,
			baseY - WORDS_FONT_SIZE,
			this.context.measureText(text).width,
			WORDS_FONT_SIZE,
		);
		const placed = this.collisionResolver.liftClear(
			natural,
			WORDS_NOTE_CLEARANCE,
			TEXT_CLEAR_KINDS,
		);
		this.context.fillText(text, placed.x, placed.bottom);
		this.context.restore();
		this.collisionResolver.add({ rect: placed, kind: 'annotation' });
		return placed.y;
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
			this.context.setFillStyle(gap.style?.fontColor ?? '#000000');
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
			}
			// Every measure's end line gets a connector joining the part's staves, so
			// internal barlines are tied across staves and not just drawn per-stave.
			// The piece's final measure gets a bold thin-thick connector to match its
			// end barline; all other measure ends get a plain single line.
			new StaveConnector(this.systemTop, this.systemBottom)
				.setType(
					this.isLightLight
						? 'thinDouble'
						: this.isLastMeasure
							? 'boldDoubleRight'
							: 'singleRight',
				)
				.setContext(this.context)
				.draw();
		}
	}

	/*
	 * After the measure loop: resolve the whole-score spanners, grow the measure boxes,
	 * and compute the per-system overflow this pass observed.
	 */
	private finishPass(): {
		pageTop: number;
		pageBottom: number;
		observedOverflow: Map<number, number>;
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
		for (const slur of this.spanners.buildSlurs(this.allChords, this.byLead)) {
			slur.setContext(this.context).draw();
		}
		// Tablature hammer-ons/pull-offs and slides, likewise resolved over the whole score.
		for (const tie of this.spanners.buildHammerPulls(
			this.allTabChords,
			this.byTabLead,
			this.showTabHammerPullText,
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
		// Pedals draw under the stave (vexflow's getYForBottomText), below the notes, so
		// grow the bottom crop to keep their "Ped…*" text / bracket from being clipped.
		// ponytail: only the final crop is grown — a pedal on a non-last system isn't
		// reserved against the system below it; add that if a fixture stacks one there.
		for (const pedal of this.spanners.buildPedals(
			this.allPedals,
			this.byLead,
		)) {
			pedal.setContext(this.context).draw();
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
			rawNotes: this.rawNotes,
			rawMeasures: this.rawMeasures,
			rawChordDiagrams: this.rawChordDiagrams,
		};
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
