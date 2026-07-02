import type { Part, Voice as ScoreVoice } from '@stringsync/mdom';
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
	LEAD_KEY,
	LEAD_TIME,
	LOG_SPACING_RATIO,
	MIN_LOG_FACTOR,
	PAGE_MARGIN_BOTTOM,
	PAGE_MARGIN_TOP,
	PAGE_MARGIN_TOP_WITH_TEMPO,
	PAGE_MARGIN_X,
	QUARTER_NOTE_TICKS,
	TAB_MIN_NOTE_SPACING,
} from '../constants';
import { gapsByMeasureIndex } from '../gaps';
import { findModifier, type NoteTranslator } from './note-translator';
import type { ScoreReader } from './score-reader';

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
	/** Each stave's y-offset within a system, indexed by global stave row. */
	staveOffsets: number[];
	/** Top margin: the first system's y. */
	top: number;
	/** Vertical gap between stacked systems. */
	systemGap: number;
	/** Page width (reference width, or content width in panoramic). */
	width: number;
	/** Left space reserved on the first system for part labels (0 when no part is
	 * labelled). Where draw places the instrument names. */
	labelIndent: number;
	/** Starting page height, before the draw pass grows it for deep ledger lines. */
	floorHeight: number;
	/** Resolved spacing curve, shared by this measurement and the draw pass so the
	 * drawn notes land where the spacing was computed for. */
	softmaxFactor: number;
};

/** One stave's inputs to the note-area measurement: the voices to size plus the
 * clef/meter/tab context that shapes their tickables. */
type StaveSpec = {
	voices: ScoreVoice[];
	clef: string;
	meterFloor: number;
	isTab: boolean;
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

	// A measure's note-area width: the sum of its notes' logarithmic widths, never below the
	// collision-free minimum or the floor. Denser measures get more space; a long note adds
	// only a little. Builds throwaway notes so the draw pass is untouched. The busiest staff
	// wins (all staves in a measure share one width).
	private measureNoteArea(
		staves: StaveSpec[],
		floor: number,
		noteSpacing: number,
		softmaxFactor: number,
	): number {
		let minNotes = 0;
		let logWidth = 0;
		for (const { voices, clef, meterFloor, isTab } of staves) {
			// Match drawNotes: pad underfull measures to the meter so the measured width
			// reserves the same trailing space the draw pass will leave.
			const endBeat = Math.max(this.reader.endBeatOf(voices), meterFloor);
			// Tab voices build TabNotes (no ghost padding), matching drawTabNotes.
			const perVoice = voices.map((voice) =>
				isTab
					? this.translator.vexflowTabTickables(voice.chords)
					: this.translator.vexflowVoiceTickables(voice.chords, clef, endBeat),
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
		return Math.max(floor, minNotes, logWidth);
	}

	/** Lay the parts out at the reference width: where every measure box sits, how
	 * staves stack within a system, and how tall/wide the page starts. Depends only on
	 * the music and the options, never on the live container — the finished result is
	 * scaled to fit its container. */
	plan(parts: Part[], config: Config): ScoreLayout {
		const layout = config.layout;
		const layoutMode = layout.type;
		// Standard without an explicit width, and panoramic's starting floor, both default
		// to DEFAULT_WIDTH (panoramic then grows the page to fit its single system).
		const width =
			(layout.type === 'standard' ? layout.referenceWidth : undefined) ??
			DEFAULT_WIDTH;
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
			return measure && this.reader.tempoOf(measure);
		});
		const y = hasTopTempo ? PAGE_MARGIN_TOP_WITH_TEMPO : PAGE_MARGIN_TOP;
		const measureCount = Math.max(
			1,
			...parts.map((part) => part.measures.length),
		);
		const totalStaves = parts.reduce(
			(sum, part) => sum + Math.max(part.staveCount, 1),
			0,
		);
		// Precompute each stave's y-offset within a system: a within-part gap after
		// every stave except a part's last, which gets the smaller inter-part gap.
		const staveOffsets: number[] = [];
		let offset = 0;
		for (const part of parts) {
			const staveCount = Math.max(part.staveCount, 1);
			for (let s = 0; s < staveCount; s++) {
				staveOffsets.push(offset);
				offset +=
					s === staveCount - 1 ? INTER_PART_SPACING : INTRA_PART_SPACING;
			}
		}

		const usable = width - 2 * x;

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
		const labelIndent =
			labelChars > 0 ? labelChars * LABEL_CHAR_WIDTH + LABEL_GAP : 0;
		const usableOf = (systemIndex: number) =>
			systemIndex === 0 ? usable - labelIndent : usable;

		// --- Spacing (content only) ---------------------------------------------------
		// A measure's note area is a pure function of its music: the sum of its notes'
		// logarithmic widths (noteSpacing per quarter, sub-linear in duration), floored at the
		// collision-free minimum and BASE_VOICE_WIDTH. More notes mean a wider measure; a long
		// note adds only a little — so identical content is identically wide everywhere.
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
				return Math.max(BASE_VOICE_WIDTH, gap.minWidth ?? 0, labelWidth);
			}
			const staves: StaveSpec[] = [];
			for (const part of parts) {
				const measure = part.measures[m];
				if (!measure) {
					continue;
				}
				const staveCount = Math.max(part.staveCount, 1);
				for (let s = 0; s < staveCount; s++) {
					const staffNumber = String(s + 1);
					const clef = measure.getClef(staffNumber);
					const voices = this.reader.staffVoices(measure.voices, staffNumber);
					if (voices.length > 0) {
						staves.push({
							voices,
							clef: clef
								? this.translator.vexflowClef(clef.sign, clef.line)
								: 'treble',
							meterFloor: this.reader.meterBeats(measure.getTime(staffNumber)),
							isTab: clef?.sign === 'TAB',
						});
					}
				}
			}
			return this.measureNoteArea(
				staves,
				BASE_VOICE_WIDTH,
				noteSpacing,
				softmaxFactor,
			);
		});

		// Lead = glyphs a stave prints before its notes. Clef (+ key, when present)
		// repeats at every system start; the time signature prints once at the piece
		// start; mid-system measures carry only a barline.
		// ponytail: fixed, deliberately generous estimates so notes never collide with
		// the glyphs; measure stave.getNoteStartX() if exact alignment is ever needed.
		const leadFull = (m: number) => {
			const hasKey = parts.some((part) => part.measures[m]?.getKey()?.rootNote);
			return (
				LEAD_BARLINE +
				LEAD_CLEF +
				(hasKey ? LEAD_KEY : 0) +
				(m === 0 ? LEAD_TIME : 0)
			);
		};
		const leadOf = (m: number, systemStart: boolean) =>
			systemStart ? leadFull(m) : LEAD_BARLINE;

		// --- Breaks -------------------------------------------------------------------
		// Standard: wrap to a new system once the next measure's note area would overrun
		// the reference width. Panoramic: one system holding every measure. Either way
		// breaks depend only on the music and width, never on the live container.
		const systems: number[][] = [];
		if (layoutMode === 'panoramic') {
			systems.push(Array.from({ length: measureCount }, (_, m) => m));
		} else {
			let row: number[] = [];
			let rowWidth = 0;
			for (let m = 0; m < measureCount; m++) {
				const area = noteAreas[m] ?? BASE_VOICE_WIDTH;
				// A <print new-system="yes"/> forces a break before this measure regardless of
				// width; otherwise wrap once the next measure's note area would overrun the line.
				const forcedBreak = parts.some(
					(part) => part.measures[m]?.print?.newSystem,
				);
				if (
					row.length > 0 &&
					(forcedBreak ||
						rowWidth + LEAD_BARLINE + area >
							usableOf(systems.length) * config.maxSystemFill)
				) {
					systems.push(row);
					row = [];
					rowWidth = 0;
				}
				rowWidth += leadOf(m, row.length === 0) + area;
				row.push(m);
			}
			if (row.length > 0) {
				systems.push(row);
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
			const areas = measures.map((m) => noteAreas[m] ?? BASE_VOICE_WIDTH);
			const areaSum = areas.reduce((sum, a) => sum + a, 0);
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
			// but every standard system is capped at the page width, so a measure too wide
			// to fit (e.g. a large noteSpacing) shrinks to fit instead of spilling off the
			// edge. Panoramic (cap = Infinity) is untouched and grows the page instead.
			const target = Math.min(cap, justify ? cap : intrinsic);
			const slack = target - intrinsic;
			const areaScale = areaSum > 0 ? (areaSum + slack) / areaSum : 1;
			let cx = x + (systemIndex === 0 ? labelIndent : 0);
			measures.forEach((m, i) => {
				const w = (leads[i] ?? 0) + (areas[i] ?? 0) * areaScale;
				boxes[m] = {
					x: cx,
					width: w,
					systemIndex,
					isSystemStart: i === 0,
					isSystemEnd: i === measures.length - 1,
				};
				cx += w;
			});
			// Standard stays at the reference width (short lines sit left with margin,
			// never scaled up; an over-wide measure overflows rather than rescaling the
			// page); panoramic grows the page to fit its single long system.
			if (layoutMode === 'panoramic') {
				naturalWidth = Math.max(naturalWidth, cx + x);
			}
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
		};
	}
}
