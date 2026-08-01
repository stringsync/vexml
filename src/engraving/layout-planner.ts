import type { Score } from '@stringsync/mdom';
import { Formatter, GraceNoteGroup } from 'vexflow';
import type { Config } from '../config';
import {
	BASE_VOICE_WIDTH,
	DEFAULT_WIDTH,
	GAP_LABEL_FONT_SIZE,
	GRACE_SPACING,
	INTER_PART_SPACING,
	INTRA_PART_SPACING,
	LABEL_CHAR_WIDTH,
	LABEL_FONT_SIZE,
	LABEL_GAP,
	LEAD_BARLINE,
	LEAD_CLEF,
	LEAD_CLEF_CHANGE,
	LEAD_KEY,
	LEAD_TIME,
	LOG_SPACING_RATIO,
	MIN_LOG_FACTOR,
	MULTI_REST_MIN_WIDTH,
	PAGE_MARGIN_BOTTOM,
	PAGE_MARGIN_TOP,
	PAGE_MARGIN_TOP_WITH_TEMPO,
	PAGE_MARGIN_X,
	QUARTER_NOTE_TICKS,
	TAB_MIN_NOTE_SPACING,
} from '../constants';
import { gapsByMeasureIndex } from '../gaps';
import {
	findModifier,
	type MidClefSpec,
	type NoteTranslator,
} from './note-translator';
import type { ScoreReader, StaffVoice } from './score-reader';
import {
	isTabStaff,
	partGroups,
	partSymbol,
	stringTuning,
	visibleStaffNumbers,
} from './staves';

/** A measure's placed box within its system. */
export type MeasureBox = {
	x: number;
	width: number;
	systemIndex: number;
	isSystemStart: boolean;
	isSystemEnd: boolean;
};

/** Where everything goes: parts laid out at a reference width, ready for the draw
 * pass. Pure geometry — no vexflow drawing happens here. */
export type ScoreLayout = {
	measureCount: number;
	totalStaves: number;
	boxes: MeasureBox[];
	/** Each stave's y-offset within a system, indexed by global stave row. The planned
	 * spacing, from the fixed constants — and the floor no system goes below. */
	staveOffsets: number[];
	/** What pass one measured each system actually needs, indexed by system (see
	 * ScoreDrawer.spacedOffsets). Absent on pass one, where every system uses the planned
	 * offsets; a system missing from it falls back to them too. */
	systemStaveOffsets?: ReadonlyMap<number, number[]>;
	/** Top margin: the first system's y. */
	top: number;
	/** Vertical gap between stacked systems. */
	systemGap: number;
	/** Page width (reference width, or content width in panoramic). */
	width: number;
	/** Left space reserved on the first system for part labels AND any <part-group> names
	 * printed outside them (0 when nothing is labelled). Where draw places the names. */
	labelIndent: number;
	/** The part-label column alone, out of `labelIndent`: names right-align against the
	 * staves inside it, and a group name right-aligns against ITS left edge. 0 when no
	 * <part-group> declares a <group-name>, in which case it equals labelIndent. */
	partLabelIndent: number;
	/** Starting page height, before the draw pass grows it for deep ledger lines. */
	floorHeight: number;
	/** Resolved spacing curve, shared by this measurement and the draw pass so the
	 * drawn notes land where the spacing was computed for. */
	softmaxFactor: number;
};

/** The two widths a measure's note area can take. `ideal` is what the spacing curve wants;
 * `min` is the hard floor below which the notes no longer fit. Layout squeezes between them
 * and never past `min`, so no configuration can produce a system with cut-off notes. */
type NoteArea = {
	min: number;
	ideal: number;
};

/** One stave's inputs to the note-area measurement: the voices to size plus the
 * clef/meter/tab context that shapes their tickables. */
type StaveSpec = {
	voices: StaffVoice[];
	clef: string;
	meterFloor: number;
	isTab: boolean;
	/** Open-string pitches of a tab staff; null for a notation staff (see stringTuning). */
	tuning: number[] | null;
	/** Mid-measure dividers (see ScoreReader.midBarlinesOf) — they take horizontal room, so
	 * the measured width has to include the same BarNotes the draw pass inserts. */
	barlines: { beat: number; style: string }[];
	/** Mid-measure clef changes (see ScoreReader.midClefsOf) — the small ClefNotes they insert
	 * take horizontal room too, and they re-aim the notes after them. */
	midClefs: MidClefSpec[];
};

export class LayoutPlanner {
	constructor(
		private readonly translator: NoteTranslator,
		private readonly reader: ScoreReader,
	) {}

	// A note's horizontal share under the logarithmic spacing curve: `noteSpacing` px at a
	// quarter note, LOG_SPACING_RATIO more/less per doubling/halving of duration, floored so
	// very short notes keep a sane share. Sub-linear in duration, so a measure's note *count*
	// drives its width far more than note *value* does.
	private noteLogWidth(ticks: number, noteSpacing: number): number {
		if (ticks <= 0) {
			return 0;
		}
		const factor =
			1 + LOG_SPACING_RATIO * Math.log2(ticks / QUARTER_NOTE_TICKS);
		return noteSpacing * Math.max(MIN_LOG_FACTOR, factor);
	}

	// The horizontal space a note's attached grace cluster needs: its preformatted width plus
	// the GRACE_SPACING lead clearance notes.ts pads before it, or 0 if it has none. Lets the
	// measure grow to hold the grace instead of compressing its real notes.
	private graceWidthOf(t: {
		getModifiers(): { getCategory(): string }[];
	}): number {
		const group = findModifier<GraceNoteGroup>(t, GraceNoteGroup.CATEGORY);
		return group ? group.getWidth() + GRACE_SPACING : 0;
	}

	/*
	 * Even out a lopsided pair of systems the width breaker produced. Packing is greedy, so
	 * it fills a system to the brim and drops whatever is left onto the next one: a document
	 * line that misses fitting by a single measure comes out as one system squashed until its
	 * lyrics collide followed by that one measure stretched across the whole page. Hand the
	 * last measure of a system back to the next one for as long as that brings the
	 * worse-fitting of the two closer to the line width.
	 *
	 * Left alone are the boundaries this isn't entitled to move: one the document forced with
	 * <print new-system="yes">, and the score's trailing system, which is meant to be short.
	 * A pair the breaker already balanced never improves on the first try, so it doesn't move.
	 */
	private evenOutSystems(
		systems: number[][],
		forcedStarts: Set<number>,
		measure: (
			measures: number[],
			systemIndex: number,
		) => { intrinsic: number; minimum: number; usable: number },
	): void {
		// How far a system is from filling its line, as a ratio >= 1 in either direction, so
		// a squashed system and a stretched one are directly comparable.
		const misfit = (measures: number[], systemIndex: number) => {
			const { intrinsic, usable } = measure(measures, systemIndex);
			return intrinsic > usable ? intrinsic / usable : usable / intrinsic;
		};
		// Whether a system's music no longer fits the line even at its collision-free minimum.
		// Evening out the ragged edges is cosmetic; the minimum is not, so a move that would
		// overrun it is refused however much better the two lines would look.
		const overruns = (measures: number[], systemIndex: number) => {
			const { minimum, usable } = measure(measures, systemIndex);
			return minimum > usable;
		};
		for (let s = 0; s + 2 < systems.length; s++) {
			const start = systems[s];
			const follow = systems[s + 1];
			const boundary = follow?.[0];
			if (!start || !follow || boundary === undefined) {
				continue;
			}
			if (forcedStarts.has(boundary)) {
				continue;
			}
			let head: number[] = start;
			let tail: number[] = follow;
			let worst = Math.max(misfit(head, s), misfit(tail, s + 1));
			while (head.length > 1) {
				const nextHead = head.slice(0, -1);
				const nextTail = head.slice(-1).concat(tail);
				// The tail is the one growing, so it's the only one that can newly overrun.
				if (overruns(nextTail, s + 1)) {
					break;
				}
				const candidate = Math.max(
					misfit(nextHead, s),
					misfit(nextTail, s + 1),
				);
				if (candidate >= worst) {
					break;
				}
				head = nextHead;
				tail = nextTail;
				worst = candidate;
			}
			systems[s] = head;
			systems[s + 1] = tail;
		}
	}

	// A measure's note-area widths: `ideal` is the sum of its notes' logarithmic widths (denser
	// measures get more space; a long note adds only a little), `min` is the width below which
	// vexflow's own formatter can no longer place those notes without collision. Every layout
	// decision is free to squeeze a measure between the two, and none may go below `min` — that
	// is what keeps notes from being cut off. Builds throwaway notes so the draw pass is
	// untouched. The busiest staff wins (all staves in a measure share one width).
	private measureNoteArea(
		staves: StaveSpec[],
		floor: number,
		noteSpacing: number,
		softmaxFactor: number,
	): NoteArea {
		let minNotes = 0;
		let logWidth = 0;
		for (const {
			voices,
			clef,
			meterFloor,
			isTab,
			tuning,
			barlines,
			midClefs,
		} of staves) {
			// Match drawNotes: pad underfull measures to the meter so the measured width
			// reserves the same trailing space the draw pass will leave.
			const endBeat = Math.max(this.reader.endBeatOf(voices), meterFloor);
			// Tab voices build TabNotes (no ghost padding), matching drawTabNotes.
			const perVoice = voices.map((voice, voiceIndex) =>
				isTab
					? this.translator.vexflowTabTickables(voice.chords, tuning)
					: this.translator.vexflowVoiceTickables(
							voice.chords,
							clef,
							endBeat,
							undefined,
							undefined,
							undefined,
							// Matches buildNotes: the dividers and clef glyphs ride on the first
							// voice only, but the clef changes re-aim every voice's notes.
							voiceIndex === 0 ? barlines : [],
							midClefs,
							voiceIndex === 0,
						),
			);
			const vexVoices = perVoice.map((tickables) =>
				this.translator.softVoice(tickables, softmaxFactor),
			);
			if (vexVoices.length === 0) {
				continue;
			}
			minNotes = Math.max(
				minNotes,
				new Formatter({ softmaxFactor })
					.joinVoices(vexVoices)
					.preCalculateMinTotalWidth(vexVoices),
			);
			// Floor a tab measure's width by its note count so dense rhythms stay legible.
			if (isTab) {
				const noteCount = Math.max(0, ...perVoice.map((t) => t.length));
				minNotes = Math.max(minNotes, noteCount * TAB_MIN_NOTE_SPACING);
			}
			// Sum each voice's per-note logarithmic widths; the busiest voice sets the width.
			// Grace notes steal no time, so they get no logarithmic share — but they still
			// occupy horizontal space left of their host. Add each grace cluster's width on top
			// so a grace-bearing measure is allocated the extra room it needs, instead of the
			// graces compressing the real notes into the same width (see graceWidthOf).
			for (const tickables of perVoice) {
				let w = 0;
				for (const t of tickables) {
					w +=
						this.noteLogWidth(t.getTicks().value(), noteSpacing) +
						this.graceWidthOf(t);
				}
				logWidth = Math.max(logWidth, w);
			}
		}
		const min = Math.max(floor, minNotes);
		return { min, ideal: Math.max(min, logWidth) };
	}

	/** Lay the parts out at the reference width: where every measure box sits, how
	 * staves stack within a system, and how tall/wide the page starts. Depends only on
	 * the music and the options, never on the live container — the finished result is
	 * scaled to fit its container. */
	plan(score: Score, config: Config): ScoreLayout {
		const parts = score.parts;
		const layout = config.layout;
		const layoutMode = layout.type;
		// Standard lays out at its reference width; panoramic starts there and grows the page
		// to fit its single system. Not const: an overflow: 'widen' layout raises it below,
		// once the breaker has shown how wide the music actually needs the page to be.
		let width =
			layout.type === 'standard' ? layout.referenceWidth : DEFAULT_WIDTH;
		// Panoramic has no wrapping to honor breaks in and grows the page to its content, so
		// it reads as 'allow' with breaks off — neither is consulted outside standard.
		const overflow = layout.type === 'standard' ? layout.overflow : 'allow';
		const honorSystemBreaks =
			layout.type === 'standard' && layout.honorSystemBreaks;
		const noteSpacing = config.noteSpacing;
		const softmaxFactor = config.softmaxFactor;

		// Measures lay left-to-right; every part's staves stack vertically down the page.
		// Staves within a part sit further apart than the gap between parts, so a
		// brace-joined group reads as one instrument. The left margin leaves room for the
		// brace/bracket, which draw left of the stave's x.
		const x = PAGE_MARGIN_X;
		// A metronome mark on the first measure sits above the top staff, so give the
		// first system extra headroom when one is present (and room to lift the mark
		// clear of a high first note). Without a tempo the top margin is unchanged.
		// Gap measures carry no directions, so a leading gap defers to the first real
		// measure (whose mark still prints on the first system).
		const gaps = gapsByMeasureIndex(config.gaps);
		const hasTopTempo = parts.some((part) => {
			const measure = part.measures.find((_, m) => !gaps.has(m));
			return (
				measure &&
				(this.reader.tempoOf(measure) || this.reader.modulationOf(measure))
			);
		});
		const y = hasTopTempo ? PAGE_MARGIN_TOP_WITH_TEMPO : PAGE_MARGIN_TOP;
		const measureCount = Math.max(
			1,
			...parts.map((part) => part.measures.length),
		);
		// With showTabs/showNotation off, staves of the hidden kind are dropped everywhere —
		// layout must iterate the same visible staves the draw pass does so offsets and
		// totalStaves stay aligned.
		const { showTabs, showNotation } = config;
		const totalStaves = parts.reduce(
			(sum, part) =>
				sum + visibleStaffNumbers(part, showTabs, showNotation).length,
			0,
		);
		// Precompute each stave's y-offset within a system: a within-part gap after
		// every stave except a part's last, which gets the smaller inter-part gap.
		const staveOffsets: number[] = [];
		let offset = 0;
		for (const part of parts) {
			const staves = visibleStaffNumbers(part, showTabs, showNotation);
			// The wider within-part gap exists so a connector-joined group reads as one
			// instrument. A part whose staves carry no connector (two tab staves, an
			// explicit <part-symbol>none) isn't such a group, so its staves sit at the
			// same even pitch as the parts around them.
			const intra = partSymbol(part, showTabs, showNotation)
				? INTRA_PART_SPACING
				: INTER_PART_SPACING;
			staves.forEach((_, s) => {
				staveOffsets.push(offset);
				offset += s === staves.length - 1 ? INTER_PART_SPACING : intra;
			});
		}

		// The first system indents to make room for the part labels printed left of the
		// staves; later systems have none. 0 when nothing is labelled. Sized to the
		// widest label plus LABEL_GAP so labels right-align just before the stave and the
		// longest still fits inside the margin without clipping.
		// ponytail: label width estimated at ~7.5px/char for 13px Arial (no render context
		// here to measure) — a hair over the ~6.9px actual, so the longest never clips its
		// left edge. Measure exactly if a font change makes the estimate drift.
		const labelChars = config.showPartLabels
			? Math.max(0, ...parts.map((part) => part.label?.length ?? 0))
			: 0;
		const partLabelIndent =
			labelChars > 0 ? labelChars * LABEL_CHAR_WIDTH + LABEL_GAP : 0;
		// A <group-name> prints outside the part labels — it names the section the bracket
		// spans, so it can't sit between a part's name and that part's stave. It gets its own
		// column of the indent, sized the same way.
		const groupChars = config.showPartLabels
			? Math.max(
					0,
					...partGroups(score).map((group) => group.name?.length ?? 0),
				)
			: 0;
		const labelIndent =
			partLabelIndent +
			(groupChars > 0 ? groupChars * LABEL_CHAR_WIDTH + LABEL_GAP : 0);
		// Reads `width` at call time, so re-running the breaker after 'widen' raises it sees
		// the wider page.
		const usableOf = (systemIndex: number) =>
			width - 2 * x - (systemIndex === 0 ? labelIndent : 0);

		// --- Spacing (content only) ---------------------------------------------------
		// A measure's note area is a pure function of its music: an `ideal` width (the sum of its
		// notes' logarithmic widths — noteSpacing per quarter, sub-linear in duration) and a `min`
		// width (vexflow's collision-free minimum, floored at BASE_VOICE_WIDTH). More notes mean a
		// wider measure; a long note adds only a little — so identical content is identically wide
		// everywhere.
		// The measures a <multiple-rest> swallows get no box at all, so they take no width, force
		// no break, and are skipped by the draw pass — the run's lead measure stands for all of
		// them (see ScoreReader.multiRestsOf).
		const { leads: multiRestLeads, hidden: multiRestHidden } =
			this.reader.multiRestsOf(parts);
		const noteAreas = Array.from({ length: measureCount }, (_, m) => {
			// A gap has no notes to size it: floor its (empty) note area at the caller's
			// minWidth and at the label's estimated width so the text fits. It stretches
			// with its system like any measure — minWidth is a floor, not an exact width.
			const gap = gaps.get(m);
			if (gap) {
				// ponytail: label width estimated from the part-label ~7.5px/char@13px ratio,
				// scaled to the gap's font size — measure exactly if a font change drifts.
				const fontSize = gap.style?.fontSize ?? GAP_LABEL_FONT_SIZE;
				const labelWidth = gap.label
					? gap.label.length * LABEL_CHAR_WIDTH * (fontSize / LABEL_FONT_SIZE) +
						2 * LABEL_GAP
					: 0;
				// The label has to fit, so it sets the gap's hard minimum; the caller's minWidth is
				// a preference, so it only raises the ideal and squeezes away like note spacing.
				const min = Math.max(BASE_VOICE_WIDTH, labelWidth);
				return { min, ideal: Math.max(min, gap.minWidth ?? 0) };
			}
			const staves: StaveSpec[] = [];
			for (const part of parts) {
				const measure = part.measures[m];
				if (!measure) {
					continue;
				}
				for (const staffNumber of visibleStaffNumbers(
					part,
					showTabs,
					showNotation,
				)) {
					const clef = measure.getClef(staffNumber);
					const voices = this.reader.staffVoices(measure.voices, staffNumber);
					if (voices.length > 0) {
						staves.push({
							voices,
							clef: clef
								? this.translator.vexflowClef(clef.sign, clef.line)
								: 'treble',
							meterFloor: this.reader.meterFloor(measure, staffNumber),
							isTab: isTabStaff(part, staffNumber),
							tuning: stringTuning(part, staffNumber),
							barlines: this.reader.midBarlinesOf(measure),
							midClefs: this.translator.midClefSpecs(
								this.reader.midClefsOf(measure, staffNumber),
							),
						});
					}
				}
			}
			// A multirest lead holds one whole rest, which would size it like any empty bar —
			// floor it so the consolidated bar and its count have room to read as a multirest.
			return this.measureNoteArea(
				staves,
				multiRestLeads.has(m) ? MULTI_REST_MIN_WIDTH : BASE_VOICE_WIDTH,
				noteSpacing,
				softmaxFactor,
			);
		});
		// Measures past the end of a short part have no entry — they fall back to an empty bar.
		const areaOf = (m: number): NoteArea =>
			noteAreas[m] ?? { min: BASE_VOICE_WIDTH, ideal: BASE_VOICE_WIDTH };

		// Lead = glyphs a stave prints before its notes. Clef (+ key, when present)
		// repeats at every system start; the time signature prints once at the piece
		// start; mid-system measures carry only a barline, plus a smaller clef when the
		// clef changes there (draw's buildStave redraws it — budget the room or the
		// change clef eats into the note area).
		// ponytail: fixed, deliberately generous estimates so notes never collide with
		// the glyphs; measure stave.getNoteStartX() if exact alignment is ever needed.
		const leadFull = (m: number) => {
			// Per STAVE, not per part: the staves of one part can carry different keys
			// (staves_different_keys), so a part whose first stave is in C still needs the
			// key's width budgeted when its second stave is not.
			const hasKey = parts.some((part) =>
				visibleStaffNumbers(part, showTabs, showNotation).some(
					(staffNumber) =>
						this.reader.keyIdentity(
							part.measures[m]?.getKey(staffNumber) ?? null,
						) !== null,
				),
			);
			return (
				LEAD_BARLINE +
				LEAD_CLEF +
				(hasKey ? LEAD_KEY : 0) +
				(m === 0 ? LEAD_TIME : 0)
			);
		};
		const clefChangesAt = (m: number) =>
			m > 0 &&
			parts.some((part) =>
				visibleStaffNumbers(part, showTabs, showNotation).some(
					(staffNumber) =>
						!isTabStaff(part, staffNumber) &&
						this.translator.vexflowClefSpec(
							part.measures[m]?.getClef(staffNumber) ?? null,
						) !==
							this.translator.vexflowClefSpec(
								// End of the previous measure, matching buildStave: a change
								// stated inside it is not restated at this barline.
								this.reader.clefAtEndOf(part.measures[m - 1], staffNumber),
							),
				),
			);
		const leadOf = (m: number, systemStart: boolean) =>
			systemStart
				? leadFull(m)
				: LEAD_BARLINE + (clefChangesAt(m) ? LEAD_CLEF_CHANGE : 0);

		// A system's width at each of the two note-area sizes: `ideal` is what it wants,
		// `min` is the narrowest it can be drawn without its notes colliding. Leads are fixed
		// glyph widths, so they count the same in both.
		const spanOf = (measures: number[], key: 'min' | 'ideal') =>
			measures.reduce(
				(sum, m, i) => sum + leadOf(m, i === 0) + areaOf(m)[key],
				0,
			);

		// --- Breaks -------------------------------------------------------------------
		// Standard: wrap to a new system once the next measure's note area would overrun
		// the reference width. Panoramic: one system holding every measure. Either way
		// breaks depend only on the music and width, never on the live container.
		const breakIntoSystems = (): number[][] => {
			if (layoutMode === 'panoramic') {
				return [
					Array.from({ length: measureCount }, (_, m) => m).filter(
						(m) => !multiRestHidden.has(m),
					),
				];
			}
			const systems: number[][] = [];
			let row: number[] = [];
			let rowWidth = 0;
			let rowMinWidth = 0;
			// First measure of every system the document forced, so the evening-out pass
			// below knows which boundaries are the document's and not the breaker's.
			const forcedStarts = new Set<number>();
			for (let m = 0; m < measureCount; m++) {
				if (multiRestHidden.has(m)) {
					continue;
				}
				const area = areaOf(m);
				const print = parts.map((part) => part.measures[m]?.print);
				// A <print new-system="yes"/> forces a break before this measure regardless of
				// width, unless honorSystemBreaks is off. So does a new page: its first measure
				// necessarily starts a system, whether or not the exporter also said so.
				const forcedBreak =
					honorSystemBreaks && print.some((p) => p?.newSystem || p?.newPage);
				// An explicit <print new-system="no"/> is a statement, not silence: the document
				// laid this line out and wants the measure to stay on it. Honor it by squeezing
				// the system rather than wrapping — but only while its notes still fit at their
				// collision-free minimum. Past that the document's line and the reference width
				// genuinely can't both hold, and `overflow` says which one gives: 'wrap' breaks
				// the line here, 'allow' and 'widen' keep it and pay for it in page width.
				const keepsLine =
					honorSystemBreaks && print.some((p) => p?.systemBreak === 'no');
				const usable = usableOf(systems.length);
				const overruns = keepsLine
					? overflow === 'wrap' &&
						rowMinWidth + LEAD_BARLINE + area.min > usable
					: rowWidth + LEAD_BARLINE + area.ideal >
						usable * config.maxSystemFill;
				// ponytail: a lone measure has nowhere to wrap to, so one whose own minimum
				// exceeds the usable width stays put and spills like overflow: 'allow' — the
				// documented hole in 'wrap'. Needs a tiny referenceWidth or a huge noteSpacing
				// to reach; splitting a measure across systems is the only real fix and no
				// caller has wanted one.
				if (row.length > 0 && (forcedBreak || overruns)) {
					if (forcedBreak) {
						forcedStarts.add(m);
					}
					systems.push(row);
					row = [];
					rowWidth = 0;
					rowMinWidth = 0;
				}
				const lead = leadOf(m, row.length === 0);
				rowWidth += lead + area.ideal;
				rowMinWidth += lead + area.min;
				row.push(m);
			}
			if (row.length > 0) {
				systems.push(row);
			}
			this.evenOutSystems(systems, forcedStarts, (measures, systemIndex) => ({
				intrinsic: spanOf(measures, 'ideal'),
				minimum: spanOf(measures, 'min'),
				usable: usableOf(systemIndex),
			}));
			return systems;
		};

		let systems = breakIntoSystems();

		// 'widen': grow the page until every system fits at its ideal spacing, then re-break
		// at the new width. Widening only ever removes wraps, and a system the breaker itself
		// ended is already bounded by maxSystemFill, so each pass leaves less to fix than the
		// last and this settles — two passes for a typical score.
		// ponytail: capped at 4 passes rather than proving convergence; the loop exits early
		// on the pass that needs no growth, so the cap only bites on pathological input.
		if (overflow === 'widen') {
			for (let pass = 0; pass < 4; pass++) {
				const needed = Math.max(
					width,
					...systems.map(
						(measures, systemIndex) =>
							spanOf(measures, 'ideal') +
							2 * x +
							(systemIndex === 0 ? labelIndent : 0),
					),
				);
				if (needed <= width) {
					break;
				}
				width = needed;
				systems = breakIntoSystems();
			}
		}

		// --- Placement ----------------------------------------------------------------
		// Lay each system left to right at intrinsic (note-area) widths. Full systems are
		// justified to the reference width by stretching note areas proportionally (the
		// per-tick rate stays uniform within the system); the last/partial system of a
		// multi-system score stays ragged unless it already fills minLastSystemFill
		// of the line (then it justifies too), and all of panoramic stays ragged, so a short
		// trailing line keeps its natural width instead of being needlessly stretched. A score
		// that fits on a single system is justified, so a lone line fills the page width.
		const boxes: MeasureBox[] = [];
		let naturalWidth = width;
		systems.forEach((measures, systemIndex) => {
			const leads = measures.map((m, i) => leadOf(m, i === 0));
			const areas = measures.map((m) => areaOf(m));
			const areaSum = areas.reduce((sum, a) => sum + a.ideal, 0);
			const intrinsic = leads.reduce((sum, l) => sum + l, 0) + areaSum;
			const cap = layoutMode === 'standard' ? usableOf(systemIndex) : Infinity;
			// The last system of a multi-system score stays ragged unless its measures already
			// fill most of the line: once their intrinsic width reaches minLastSystemFill
			// of the reference width, justify it so a nearly-full trailing line snaps to the page
			// edge instead of leaving a sliver of margin. Full systems always justify. A lone
			// single system also always justifies — unless stretchSingleSystem is off, which
			// makes it obey the same minLastSystemFill rule as a trailing line, so a short
			// excerpt keeps its natural width instead of being blown up across the page.
			const isLastOfMany =
				systemIndex === systems.length - 1 && systems.length > 1;
			const isRaggableLone =
				systems.length === 1 && !config.stretchSingleSystem;
			const obeysMinFill = isLastOfMany || isRaggableLone;
			const justify =
				layoutMode === 'standard' &&
				(!obeysMinFill || intrinsic >= cap * config.minLastSystemFill);
			// Justified systems fill the page; ragged systems keep their intrinsic width —
			// and every standard system is capped at the page width, so an over-wide system
			// squeezes toward it. Panoramic (cap = Infinity) is untouched and grows the page.
			const target = Math.min(cap, justify ? cap : intrinsic);
			// The note areas absorb the difference between what the system wants and what it
			// gets. Stretching is uniform — every measure grows by the same factor, keeping the
			// spacing curve's proportions. Squeezing is NOT: each measure gives up the same
			// fraction of its own give (ideal - min), so a measure with none to give — an empty
			// bar already at the floor, a bar of 16ths already at its minimum — holds its width
			// while its roomier neighbors close up. A uniform squeeze would instead let the
			// least compressible measure in the line dictate terms for all of them.
			//
			// Once every measure sits at its minimum the system stops shrinking and spills past
			// the page. That floor is what makes cut-off notes unreachable: every width decision
			// above may push against it, none may pass it, and naturalWidth below grows to cover
			// whatever spilled so the score scales down instead of clipping.
			const areaTarget = target - leads.reduce((sum, l) => sum + l, 0);
			const give = areaSum - areas.reduce((sum, a) => sum + a.min, 0);
			const squeeze = give > 0 ? Math.min(1, (areaSum - areaTarget) / give) : 1;
			const stretch = areaSum > 0 ? areaTarget / areaSum : 1;
			const areaWidth = (a: NoteArea) =>
				areaTarget >= areaSum
					? a.ideal * stretch
					: a.ideal - (a.ideal - a.min) * squeeze;
			let cx = x + (systemIndex === 0 ? labelIndent : 0);
			measures.forEach((m, i) => {
				const area = areas[i];
				const w = (leads[i] ?? 0) + (area ? areaWidth(area) : 0);
				boxes[m] = {
					x: cx,
					width: w,
					systemIndex,
					isSystemStart: i === 0,
					isSystemEnd: i === measures.length - 1,
				};
				cx += w;
			});
			// The page box always covers what was actually drawn. Short lines sit left with
			// margin and never widen it; panoramic grows it to fit its single long system,
			// and a standard system that bottomed out on its minimum grows it by however far
			// it spilled — so the score scales down into its container rather than clipping.
			naturalWidth = Math.max(naturalWidth, cx + x);
		});

		const floorHeight = y + offset + PAGE_MARGIN_BOTTOM;

		return {
			measureCount,
			totalStaves,
			boxes,
			staveOffsets,
			top: y,
			systemGap: config.systemSpacing,
			width: naturalWidth,
			floorHeight,
			softmaxFactor,
			labelIndent,
			partLabelIndent,
		};
	}
}
