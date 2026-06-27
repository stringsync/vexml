import type { Part, Voice as ScoreVoice } from '@stringsync/mdom';
import { Formatter, Voice } from 'vexflow';
import type { Config } from './config';
import {
	BASE_VOICE_WIDTH,
	INTER_PART_SPACING,
	INTRA_PART_SPACING,
	LABEL_CHAR_WIDTH,
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
	REFERENCE_WIDTH,
	SYSTEM_GAP,
	TAB_MIN_NOTE_SPACING,
} from './constants';
import {
	endBeatOf,
	meterBeats,
	staffVoices,
	tempoOf,
	vexflowClef,
	vexflowTabTickables,
	vexflowVoiceTickables,
} from './notes';

/** How measures are placed across systems. */
export type Layout =
	| {
			/** Wrap measures onto stacked systems (print-like). */
			type: 'standard';
			/** Reference layout width in px. The score is laid out to this width once;
			 * the SVG viewBox then scales the result to whatever container it's placed
			 * in, so resizing the container never re-flows or re-spaces it. */
			width: number;
	  }
	| {
			/** Lay every measure on one system (horizontal scroll); width is computed
			 * from the content. */
			type: 'panoramic';
	  };

/** When to print measure numbers above the staff. */
export type MeasureNumbering =
	| 'none'
	| 'system'
	| 'every'
	| 'every-2'
	| 'every-3';

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

// A note's horizontal share under the logarithmic spacing curve: `noteSpacing` px at a
// quarter note, LOG_SPACING_RATIO more/less per doubling/halving of duration, floored so
// very short notes keep a sane share. Sub-linear in duration, so a measure's note *count*
// drives its width far more than note *value* does.
function noteLogWidth(ticks: number, noteSpacing: number): number {
	if (ticks <= 0) {
		return 0;
	}
	const factor = 1 + LOG_SPACING_RATIO * Math.log2(ticks / QUARTER_NOTE_TICKS);
	return noteSpacing * Math.max(MIN_LOG_FACTOR, factor);
}

// A measure's note-area width: the sum of its notes' logarithmic widths, never below the
// collision-free minimum or the floor. Denser measures get more space; a long note adds
// only a little. Builds throwaway notes so the draw pass is untouched. The busiest staff
// wins (all staves in a measure share one width).
function measureNoteArea(
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
		const endBeat = Math.max(endBeatOf(voices), meterFloor);
		// Tab voices build TabNotes (no ghost padding), matching drawTabNotes.
		const perVoice = voices.map((voice) =>
			isTab
				? vexflowTabTickables(voice.chords)
				: vexflowVoiceTickables(voice.chords, clef, endBeat),
		);
		const vexVoices = perVoice.map((tickables) =>
			new Voice()
				.setMode(Voice.Mode.SOFT)
				.setSoftmaxFactor(softmaxFactor)
				.addTickables(tickables),
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
		for (const tickables of perVoice) {
			let w = 0;
			for (const t of tickables) {
				w += noteLogWidth(t.getTicks().value(), noteSpacing);
			}
			logWidth = Math.max(logWidth, w);
		}
	}
	return Math.max(floor, minNotes, logWidth);
}

/** Lay the parts out at the reference width: where every measure box sits, how
 * staves stack within a system, and how tall/wide the page starts. Depends only on
 * the music and the options, never on the live container — the SVG viewBox scales
 * the finished result to fit. */
export function computeLayout(parts: Part[], config: Config): ScoreLayout {
	const layout = config.layout;
	const layoutMode = layout.type;
	// Panoramic computes its own width; REFERENCE_WIDTH is the page's starting floor.
	const width = layout.type === 'standard' ? layout.width : REFERENCE_WIDTH;
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
	const hasTopTempo = parts.some(
		(part) => part.measures[0] && tempoOf(part.measures[0]),
	);
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
			offset += s === staveCount - 1 ? INTER_PART_SPACING : INTRA_PART_SPACING;
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
				const voices = staffVoices(measure.voices, staffNumber);
				if (voices.length > 0) {
					staves.push({
						voices,
						clef: clef ? vexflowClef(clef.sign, clef.line) : 'treble',
						meterFloor: meterBeats(measure.getTime(staffNumber)),
						isTab: clef?.sign === 'TAB',
					});
				}
			}
		}
		return measureNoteArea(
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
			if (
				row.length > 0 &&
				rowWidth + LEAD_BARLINE + area > usableOf(systems.length)
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
	// multi-system score — and all of panoramic — stay ragged, so a short trailing
	// line keeps its natural width instead of being needlessly stretched. A score that
	// fits on a single system is justified, so a lone line fills the page width.
	const boxes: MeasureBox[] = [];
	let naturalWidth = width;
	systems.forEach((measures, systemIndex) => {
		const leads = measures.map((m, i) => leadOf(m, i === 0));
		const areas = measures.map((m) => noteAreas[m] ?? BASE_VOICE_WIDTH);
		const areaSum = areas.reduce((sum, a) => sum + a, 0);
		const intrinsic = leads.reduce((sum, l) => sum + l, 0) + areaSum;
		const justify =
			layoutMode === 'standard' &&
			(systemIndex < systems.length - 1 || systems.length === 1);
		const cap = layoutMode === 'standard' ? usableOf(systemIndex) : Infinity;
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
		systemGap: SYSTEM_GAP,
		width: naturalWidth,
		floorHeight,
		softmaxFactor,
		labelIndent,
	};
}
