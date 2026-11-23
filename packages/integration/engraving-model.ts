import type { RawEngraving, RawNote, RawStave } from './engraving-collect';
import { type Box, Ink } from './engraving-ink';
import {
	type EngravingMark,
	EngravingMarks,
	formatSpaces,
	type MarkPoint,
} from './engraving-marks';

export interface StaveReference {
	left: number;
	right: number;
	y: number;
}

export interface EngravedNote extends RawNote {
	/** The y of the notehead's centre. */
	cy: number;
	stem: Ink | null;
	/** The measure's stave-space in px. */
	space: number;
	/** Records measurement and reference marks onto the owning Engraving. */
	readonly marks: EngravingMarks;
	/** The full-system horizontal span of this note's middle stave line, if present. */
	readonly middleLine: StaveReference | null;
}

export interface EngravingOptions {
	/** Fixture rule name (e.g. 'stem-length'), used for mark output filenames. */
	rule?: string;
	/** Screenshot PNG bytes produced alongside the geometry. */
	image?: Buffer;
}

/** A measured value paired with the Engraving that recorded its visual marks. */
export interface EngravingCheck<T> {
	readonly engraving: Engraving;
	readonly value: T;
}

/** A render's notes, each with its stem's ink, in score pixels. */
export class Engraving {
	readonly inks: Ink[];
	readonly notes: EngravedNote[];
	readonly shift: MarkPoint;
	readonly marks = new EngravingMarks();
	readonly rule: string | null;
	readonly image: Buffer | null;

	constructor(
		readonly raw: RawEngraving,
		opts: EngravingOptions = {},
	) {
		this.rule = opts.rule ?? null;
		this.image = opts.image ?? null;
		// Masks are in capture pixels, offset from score space by the capture's margin: find
		// the shift that lands the most notehead ink on notehead rects, and undo it.
		this.shift = maskShift(raw);
		this.inks = raw.masks.map((m) =>
			new Ink(m).moved(-this.shift.x, -this.shift.y),
		);
		const stems = this.of('stem');
		this.notes = raw.notes.map((note) => ({
			...note,
			cy: note.head.y + note.head.h / 2,
			stem: note.pitch === null ? null : stemOf(note.head, stems),
			space: this.space(note.measure),
			marks: this.marks,
			middleLine: middleLineSpan(raw.staves, note.measure),
		}));
	}

	/** Measure indices present in the render, in score order. */
	get measures(): number[] {
		return this.raw.staves.map((s) => s.measure);
	}

	of(kind: string): Ink[] {
		return this.inks.filter((ink) => ink.kind === kind);
	}

	/** A stave-space in px: the gap between the measure's first two lines. */
	space(measure = 0): number {
		const lines =
			this.raw.staves.find((s) => s.measure === measure)?.lines ?? [];
		return (lines[1] ?? 0) - (lines[0] ?? 0) || 10;
	}

	/** A measure's notes, rests left out, in order. */
	headsIn(measure: number): EngravedNote[] {
		return this.notes.filter((n) => n.measure === measure && n.pitch !== null);
	}

	/** Pairs a measured value with this Engraving so `toMatchMeasurements` writes its marks. */
	check<T>(value: T): EngravingCheck<T> {
		return { engraving: this, value };
	}

	/** Recorded marks shifted back from score space into screenshot pixels. */
	exportMarks(): EngravingMark[] {
		return this.marks.toScreenshot(this.shift);
	}
}

// Offset a bracket from the stem edge so it stands clear of the stem ink.
const BRACKET_GAP = 6;

/** From the notehead's centre to the stem's free end, in px; records its visual bracket. */
export function stemLength(note: EngravedNote): number {
	if (!note.stem) {
		throw new Error(`${note.pitch} has no stem`);
	}
	const { x, y, w, h } = note.stem.box;
	const up = y + h / 2 < note.cy;
	const tipY = up ? y : y + h;
	const px = Math.abs(tipY - note.cy);
	const spaces = Math.round((px / note.space) * 4) / 4;
	const label = formatSpaces(spaces);
	const bracketX = up ? x + w + BRACKET_GAP : x - BRACKET_GAP;
	const direction = up ? 'up-stem' : 'down-stem';
	note.marks.measure({
		kind: 'bracket',
		from: { x: bracketX, y: note.cy },
		to: { x: bracketX, y: tipY },
		label,
		note: `${note.pitch ?? 'note'} ${direction}: ${label} spaces from notehead centre to stem tip`,
	});
	if (note.middleLine) {
		const { left, right, y: midY } = note.middleLine;
		note.marks.reference(`middle-line:${Math.round(midY)}`, {
			kind: 'line',
			from: { x: left, y: midY },
			to: { x: right, y: midY },
			label: 'middle line',
			note: 'Middle stave line',
		});
	}
	return px;
}

function middleLineSpan(
	staves: RawStave[],
	measure: number,
): StaveReference | null {
	const stave = staves.find((s) => s.measure === measure);
	const midY = stave?.lines[2];
	if (midY === undefined) {
		return null;
	}
	// Span across every measure in the same system so the reference line runs cleanly across the stave.
	const sameSystem = staves.filter((s) => {
		const y = s.lines[2];
		return y !== undefined && Math.abs(y - midY) <= 1 && s.box.w > 0;
	});
	if (sameSystem.length === 0) {
		return null;
	}
	const left = Math.min(...sameSystem.map((s) => s.box.x));
	const right = Math.max(...sameSystem.map((s) => s.box.x + s.box.w));
	return { left, right, y: midY };
}

function maskShift(raw: RawEngraving): { x: number; y: number } {
	const heads = raw.masks
		.filter((m) => m.kind === 'notehead')
		.map((m) => new Ink(m).box);
	const votes = new Map<string, number>();
	for (const ink of heads) {
		for (const note of raw.notes) {
			const dx = Math.round(ink.x - note.head.x);
			const dy = Math.round(ink.y - note.head.y);
			if (Math.abs(dx) <= 40 && Math.abs(dy) <= 40) {
				const key = `${dx},${dy}`;
				votes.set(key, (votes.get(key) ?? 0) + 1);
			}
		}
	}
	const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
	const [x, y] = (best?.[0] ?? '0,0').split(',').map(Number);
	return { x: x ?? 0, y: y ?? 0 };
}

function stemOf(head: Box, stems: Ink[]): Ink | null {
	// A stem touches its head's left or right edge and reaches the head's centre row.
	const cy = head.y + head.h / 2;
	const candidates = stems.filter((stem) => {
		const b = stem.box;
		const nearX =
			Math.abs(b.x - head.x) <= 2 ||
			Math.abs(b.x + b.w - (head.x + head.w)) <= 2;
		return nearX && b.y - 2 <= cy + head.h && b.y + b.h + 2 >= cy - head.h;
	});
	candidates.sort(
		(a, b) => distanceY(a.box, cy) - distanceY(b.box, cy) || b.box.h - a.box.h,
	);
	return candidates[0] ?? null;
}

function distanceY(b: Box, y: number): number {
	if (y >= b.y && y <= b.y + b.h) {
		return 0;
	}
	return Math.min(Math.abs(b.y - y), Math.abs(b.y + b.h - y));
}
