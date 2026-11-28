import type { RawEngraving, RawNote, RawStave } from './engraving-collect';
import { type Box, Ink } from './engraving-ink';
import {
	type EngravingMark,
	EngravingMarks,
	formatSpaces,
	type MarkPoint,
} from './engraving-marks';

export interface NoteFilter {
	voice?: string;
	part?: number;
}

export interface StaveReference {
	left: number;
	right: number;
	y: number;
}

export interface EngravedNote extends RawNote {
	/** The y of the notehead's centre. */
	cy: number;
	stem: Ink | null;
	flag: Ink | null;
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
		const flags = this.of('flag');
		this.notes = raw.notes.map((note) => ({
			...note,
			cy: note.head.y + note.head.h / 2,
			stem: note.pitch === null ? null : stemOf(note.head, stems),
			flag: note.pitch === null ? null : nearest(note.head, flags),
			space: this.space(note.measure),
			marks: this.marks,
			middleLine: middleLineSpan(raw.staves, note.measure),
		}));
	}

	/** Measure indices present in the render, in score order. */
	get measures(): number[] {
		return this.raw.staves
			.filter((s) => (s.part ?? 0) === 0 && (s.staff ?? 1) === 1)
			.map((s) => s.measure);
	}

	of(kind: string): Ink[] {
		return this.inks.filter((ink) => ink.kind === kind);
	}

	/** Ink of one kind whose box lies within measure (by its column's x range) and part. */
	inMeasure(kind: string, measure: number, part = 0): Ink[] {
		const rect = this.measureRect(measure);
		const lines = this.lines(measure, part);
		const top = (lines[0] ?? 0) - 8 * this.space(measure, part);
		const bottom =
			(lines[lines.length - 1] ?? 0) + 8 * this.space(measure, part);
		return this.of(kind).filter((ink) => {
			const cx = ink.box.x + ink.box.w / 2;
			const cy = ink.box.y + ink.box.h / 2;
			return cx >= rect.x && cx < rect.x + rect.w && cy >= top && cy <= bottom;
		});
	}

	measureRect(measure: number): Box {
		const found = this.raw.measures?.find((m) => m.index === measure);
		if (!found) {
			throw new Error(`no measure ${measure}`);
		}
		return found.rect;
	}

	lines(measure: number, part = 0, staff = 1): number[] {
		return (
			this.raw.staves.find(
				(s) =>
					s.measure === measure &&
					(s.part ?? 0) === part &&
					(s.staff ?? 1) === staff,
			)?.lines ?? []
		);
	}

	/** A stave-space in px: the gap between the measure's first two lines. */
	space(measure = 0, part = 0): number {
		const lines = this.lines(measure, part);
		return (lines[1] ?? 0) - (lines[0] ?? 0) || 10;
	}

	middle(measure: number, part = 0): number {
		const lines = this.lines(measure, part);
		return lines[Math.floor(lines.length / 2)] ?? 0;
	}

	/** A measure's notes, rests and grace notes left out, in order. */
	headsIn(measure: number, filter: number | NoteFilter = 0): EngravedNote[] {
		const part = typeof filter === 'number' ? filter : (filter.part ?? 0);
		const voice = typeof filter === 'number' ? undefined : filter.voice;
		return this.notes.filter(
			(n) =>
				n.measure === measure &&
				(n.part ?? 0) === part &&
				!n.grace &&
				(voice === undefined || n.voice === voice) &&
				n.pitch !== null,
		);
	}

	/** A measure's rests, in order. */
	restsIn(measure: number, filter: number | NoteFilter = 0): EngravedNote[] {
		const part = typeof filter === 'number' ? filter : (filter.part ?? 0);
		const voice = typeof filter === 'number' ? undefined : filter.voice;
		return this.notes.filter(
			(n) =>
				n.measure === measure &&
				(n.part ?? 0) === part &&
				!n.grace &&
				(voice === undefined || n.voice === voice) &&
				n.pitch === null,
		);
	}

	/** Stave line thickness in px, read off the stave's ink. */
	lineThickness(): number {
		const stave = this.of('stave')[0];
		if (!stave) {
			return 0;
		}
		const x = stave.box.x + Math.floor(stave.box.w / 2);
		const bands = stave.bandsAt(x);
		return Math.min(...bands.map(([a, b]) => b - a));
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

/** Up when the stem rises from the head. */
export function stemDirection(note: EngravedNote): 'up' | 'down' | null {
	if (!note.stem) {
		return null;
	}
	const { y, h } = note.stem.box;
	return y + h / 2 < note.cy ? 'up' : 'down';
}

/** The stem's free end (including its flag's tip, since vexflow retracts the stem under the flag). */
export function stemTip(note: EngravedNote): number {
	if (!note.stem) {
		throw new Error(`${note.pitch} has no stem`);
	}
	const { y, h } = note.stem.box;
	if (stemDirection(note) === 'up') {
		return note.flag ? Math.min(y, note.flag.box.y) : y;
	}
	return note.flag ? Math.max(y + h, note.flag.box.y + note.flag.box.h) : y + h;
}

/** From the notehead's centre to the stem's free end, in px; records its visual bracket. */
export function stemLength(note: EngravedNote): number {
	if (!note.stem) {
		throw new Error(`${note.pitch} has no stem`);
	}
	const { x, y, w, h } = note.stem.box;
	const up = y + h / 2 < note.cy;
	const tipY = stemTip(note);
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

/** The stem's centre column. */
export function stemX(note: EngravedNote): number {
	if (!note.stem) {
		throw new Error(`${note.pitch} has no stem`);
	}
	return Math.floor(note.stem.box.x + note.stem.box.w / 2);
}

/**
 * A beam group's levels at a stem: each band of beam ink in that stem's column, ordered
 * from the outer beam (furthest from the heads) inwards.
 */
export function beamBands(
	beam: Ink,
	x: number,
	direction: 'up' | 'down',
): [number, number][] {
	const bands = beam.bandsAt(x);
	return direction === 'up' ? bands : [...bands].reverse();
}

/** The beam ink a stem joins: the beam whose box covers the stem's x and its tip. */
export function beamOf(note: EngravedNote, beams: Ink[]): Ink | null {
	if (!note.stem) {
		return null;
	}
	const x = stemX(note);
	const tip = stemTip(note);
	return (
		beams.find(
			(b) =>
				x >= b.box.x - 1 &&
				x <= b.box.x + b.box.w + 1 &&
				tip >= b.box.y - 3 &&
				tip <= b.box.y + b.box.h + 3,
		) ?? null
	);
}

export interface BeamedStem {
	x: number;
	tip: number;
	direction: 'up' | 'down';
	/** The group's heads on this stem, the one nearest the beam first. */
	heads: EngravedNote[];
	/** Beam levels at this stem, outer first. */
	bands: [number, number][];
}

export interface BeamGroup {
	beam: Ink;
	stems: BeamedStem[];
}

/** Each beam drawn in a measure, with the stems that join it, left to right. */
export function beamGroups(
	engraving: Engraving,
	measure: number,
	opts: NoteFilter = {},
): BeamGroup[] {
	const beams = engraving.inMeasure('beam', measure, opts.part ?? 0);
	const heads = engraving.headsIn(measure, opts).filter((n) => n.stem);
	return beams
		.map((beam) => {
			const byStem = new Map<Ink, EngravedNote[]>();
			for (const head of heads) {
				if (head.stem && beamOf(head, [beam]) === beam) {
					byStem.set(head.stem, [...(byStem.get(head.stem) ?? []), head]);
				}
			}
			const stems = [...byStem.values()].map((members) => {
				const first = members[0] as EngravedNote;
				const direction = stemDirection(first) ?? 'up';
				const sorted = [...members].sort((a, b) =>
					direction === 'up' ? a.cy - b.cy : b.cy - a.cy,
				);
				const x = stemX(first);
				return {
					x,
					tip: stemTip(first),
					direction,
					heads: sorted,
					bands: beamBands(beam, insideBeam(beam, x), direction),
				};
			});
			stems.sort((a, b) => a.x - b.x);
			return { beam, stems };
		})
		.filter((g) => g.stems.length > 0)
		.sort((a, b) => (a.stems[0]?.x ?? 0) - (b.stems[0]?.x ?? 0));
}

/** A column inside the beam's box: a group's end stems sit on its edge column. */
function insideBeam(beam: Ink, x: number): number {
	return Math.min(Math.max(x, beam.box.x), beam.box.x + beam.box.w - 1);
}

/** A beam's vertical fall from its first stem to its last, in px (positive falls, negative rises). */
export function beamRise(group: BeamGroup): number {
	const first = group.stems[0];
	const last = group.stems[group.stems.length - 1];
	if (!first || !last) {
		return 0;
	}
	const top = (x: number) => {
		const band = group.beam.bandsAt(insideBeam(group.beam, x))[0];
		return band ? (band[0] + band[1]) / 2 : 0;
	};
	return top(last.x) - top(first.x);
}

/** The y of a group's outer beam edge (away from the heads) at a stem. */
export function outerEdge(stem: BeamedStem): number {
	const outer = stem.bands[0];
	if (!outer) {
		return stem.tip;
	}
	return stem.direction === 'up' ? outer[0] : outer[1];
}

/** A band's height in px. */
export function bandHeight([top, bottom]: [number, number]): number {
	return bottom - top;
}

/** Whether a beam band hangs from, sits on or centres on one of the lines. */
export function touchesLine(band: [number, number], lines: number[]): boolean {
	const [top, bottom] = band;
	const centre = (top + bottom) / 2;
	return lines.some(
		(line) =>
			Math.abs(top - line) <= 1 ||
			Math.abs(bottom - line) <= 1.5 ||
			Math.abs(centre - line) <= 1,
	);
}

/** Whether a band's centre lies between the outer lines. */
export function insideStave(band: [number, number], lines: number[]): boolean {
	const centre = (band[0] + band[1]) / 2;
	return centre > (lines[0] ?? 0) && centre < (lines[lines.length - 1] ?? 0);
}

/** The bands of a stem that float in a space inside the stave, touching no line. */
export function floatingBands(
	stem: BeamedStem,
	lines: number[],
): [number, number][] {
	return stem.bands.filter(
		(b) => insideStave(b, lines) && !touchesLine(b, lines),
	);
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

function nearest(head: Box, inks: Ink[]): Ink | null {
	const cx = head.x + head.w / 2;
	const cy = head.y + head.h / 2;
	const close = inks.filter((ink) => {
		const b = ink.box;
		return (
			b.x >= head.x - 2 &&
			b.x <= head.x + head.w + 4 &&
			Math.abs(b.y + b.h / 2 - cy) < 60
		);
	});
	close.sort(
		(a, b) =>
			Math.abs(a.box.x - cx) - Math.abs(b.box.x - cx) ||
			Math.abs(a.box.y - cy) - Math.abs(b.box.y - cy),
	);
	return close[0] ?? null;
}
