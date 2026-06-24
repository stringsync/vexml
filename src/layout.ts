import type { Part, Voice as ScoreVoice } from '@stringsync/mdom';
import { Formatter, Voice } from 'vexflow';
import { vexflowChord, vexflowClef } from './stave-notes';

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

export type LayoutOptions = {
	layout?: Layout;
	pxPerTick?: number;
	softmaxFactor?: number;
};

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
	/** Starting page height, before the draw pass grows it for deep ledger lines. */
	floorHeight: number;
	/** Resolved spacing curve, shared by this measurement and the draw pass so the
	 * drawn notes land where the spacing was computed for. */
	softmaxFactor: number;
};

// A measure's note-area width: the musical-time width (ticks * pxPerTick) so equal
// durations get equal space everywhere, never below the collision-free minimum or
// the floor. Builds throwaway notes so the draw pass is untouched. The busiest
// staff wins (all staves in a measure share one width).
function measureNoteArea(
	staves: { voices: ScoreVoice[]; clef: string }[],
	floor: number,
	pxPerTick: number,
	softmaxFactor: number,
): number {
	let minNotes = 0;
	let ticks = 0;
	for (const { voices, clef } of staves) {
		const vexVoices = voices.map((voice) =>
			new Voice()
				.setMode(Voice.Mode.SOFT)
				.setSoftmaxFactor(softmaxFactor)
				.addTickables(voice.chords.map((chord) => vexflowChord(chord, clef))),
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
		for (const vexVoice of vexVoices) {
			ticks = Math.max(ticks, vexVoice.getTicksUsed().value());
		}
	}
	return Math.max(floor, minNotes, ticks * pxPerTick);
}

/** Lay the parts out at the reference width: where every measure box sits, how
 * staves stack within a system, and how tall/wide the page starts. Depends only on
 * the music and the options, never on the live container — the SVG viewBox scales
 * the finished result to fit. */
export function computeLayout(
	parts: Part[],
	options?: LayoutOptions,
): ScoreLayout {
	const layout = options?.layout ?? { type: 'standard', width: 1000 };
	const layoutMode = layout.type;
	// Panoramic computes its own width; 1000 is the page's starting floor.
	const width = layout.type === 'standard' ? layout.width : 1000;
	// Absolute floor for a measure's note area.
	const baseVoiceWidth = 80;
	const pxPerTick = options?.pxPerTick ?? 0.012;
	const softmaxFactor = options?.softmaxFactor ?? 10;

	// Measures lay left-to-right; every part's staves stack vertically down the page.
	// Staves within a part sit further apart than the gap between parts, so a
	// brace-joined group reads as one instrument. The left margin leaves room for the
	// brace/bracket, which draw left of the stave's x.
	const x = 30;
	const y = 40;
	const intraPartSpacing = 120;
	const interPartSpacing = 80;
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
			offset += s === staveCount - 1 ? interPartSpacing : intraPartSpacing;
		}
	}

	const usable = width - 2 * x;

	// --- Spacing (content only) ---------------------------------------------------
	// A measure's note area is a pure function of its music: the musical-time width
	// (ticks * pxPerTick), floored at the collision-free minimum and baseVoiceWidth.
	// One global pxPerTick means identical content is identically wide everywhere in
	// the piece.
	const noteAreas = Array.from({ length: measureCount }, (_, m) => {
		const staves: { voices: ScoreVoice[]; clef: string }[] = [];
		for (const part of parts) {
			const measure = part.measures[m];
			if (!measure) {
				continue;
			}
			const staveCount = Math.max(part.staveCount, 1);
			for (let s = 0; s < staveCount; s++) {
				const staffNumber = String(s + 1);
				const clef = measure.getClef(staffNumber);
				// TAB notes aren't drawn yet, so they reserve no note width.
				if (clef?.sign === 'TAB') {
					continue;
				}
				const voices = measure.voices.filter(
					(v) => v.staff === staffNumber && v.chords.length > 0,
				);
				if (voices.length > 0) {
					staves.push({
						voices,
						clef: clef ? vexflowClef(clef.sign, clef.line) : 'treble',
					});
				}
			}
		}
		return measureNoteArea(staves, baseVoiceWidth, pxPerTick, softmaxFactor);
	});

	// Lead = glyphs a stave prints before its notes. Clef (+ key, when present)
	// repeats at every system start; the time signature prints once at the piece
	// start; mid-system measures carry only a barline.
	// ponytail: fixed, deliberately generous estimates so notes never collide with
	// the glyphs; measure stave.getNoteStartX() if exact alignment is ever needed.
	const leadCont = 12;
	const leadFull = (m: number) => {
		const hasKey = parts.some((part) => part.measures[m]?.getKey()?.rootNote);
		return 12 + 32 + (hasKey ? 40 : 0) + (m === 0 ? 32 : 0);
	};
	const leadOf = (m: number, systemStart: boolean) =>
		systemStart ? leadFull(m) : leadCont;

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
			const area = noteAreas[m] ?? baseVoiceWidth;
			if (row.length > 0 && rowWidth + leadCont + area > usable) {
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
	// per-tick rate stays uniform within the system); the last/partial system — and
	// all of panoramic — stay ragged, so a short line or lone measure keeps its
	// natural width instead of being needlessly stretched.
	const boxes: MeasureBox[] = [];
	let naturalWidth = width;
	systems.forEach((measures, systemIndex) => {
		const leads = measures.map((m, i) => leadOf(m, i === 0));
		const areas = measures.map((m) => noteAreas[m] ?? baseVoiceWidth);
		const areaSum = areas.reduce((sum, a) => sum + a, 0);
		const intrinsic = leads.reduce((sum, l) => sum + l, 0) + areaSum;
		const justify =
			layoutMode === 'standard' && systemIndex < systems.length - 1;
		const slack = justify ? Math.max(0, usable - intrinsic) : 0;
		const areaScale = areaSum > 0 ? (areaSum + slack) / areaSum : 1;
		let cx = x;
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

	// SYSTEM_GAP is the visual gap between stacked systems plus room for the next
	// system's notes that rise above its top staff.
	// ponytail: fixed upward clearance; pre-measure per-system note extent if an
	// extreme tessitura ever rises into the system above.
	const SYSTEM_GAP = 90;
	const floorHeight = y + offset + 40;

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
	};
}
