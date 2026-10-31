import { Rect } from 'core/geometry';
import { PNG } from 'pngjs';

/**
 * A render's pixels reduced to what matters for a lint: which of them are ink. A linter
 * asking "did anything get drawn here?" works on any renderer's PNG without knowing its
 * colors or theme, so the map decides ink against the background it finds in the corner
 * pixel: on a transparent canvas ink is anything opaque; otherwise anything whose
 * luminance strays far enough from the background's.
 */
export class InkMap {
	static fromPng(png: Buffer): InkMap {
		const image = PNG.sync.read(png);
		const { width, height, data } = image;
		const ink = new Uint8Array(width * height);
		// The corner is background in every renderer: each pads its capture by a margin.
		const transparent = (data[3] ?? 0) < OPAQUE;
		const background = luminance(data, 0);
		for (let i = 0; i < width * height; i++) {
			const at = i * 4;
			if ((data[at + 3] ?? 0) < OPAQUE) {
				continue;
			}
			ink[i] = Number(
				transparent || Math.abs(luminance(data, at) - background) >= CONTRAST,
			);
		}
		return new InkMap(width, height, ink);
	}

	/** A map from a picture of it: `#` is ink, anything else is not. Every row must be as
	 * wide as the first. */
	static fromRows(rows: readonly string[]): InkMap {
		const width = rows[0]?.length ?? 0;
		const ink = new Uint8Array(width * rows.length);
		rows.forEach((row, y) => {
			for (let x = 0; x < width; x++) {
				ink[y * width + x] = Number(row[x] === '#');
			}
		});
		return new InkMap(width, rows.length, ink);
	}

	constructor(
		readonly width: number,
		readonly height: number,
		private readonly ink: Uint8Array,
	) {}

	get bounds(): Rect {
		return new Rect(0, 0, this.width, this.height);
	}

	isInk(x: number, y: number): boolean {
		return this.ink[y * this.width + x] === 1;
	}

	get isBlank(): boolean {
		return !this.ink.includes(1);
	}

	/** How much of row `y` is ink, and the `[start, end)` x span it lies in; null for a
	 * row with none. */
	rowInk(y: number): { count: number; start: number; end: number } | null {
		let count = 0;
		let start = -1;
		let end = 0;
		for (let x = 0; x < this.width; x++) {
			if (!this.isInk(x, y)) {
				continue;
			}
			count++;
			start = start < 0 ? x : start;
			end = x + 1;
		}
		return start < 0 ? null : { count, start, end };
	}

	/** The ink runs along row `y`, as `[start, end)` x spans, longest first. */
	rowRuns(y: number): Array<[number, number]> {
		return runs(this.width, (x) => this.isInk(x, y));
	}

	/** The ink runs along column `x`, as `[start, end)` y spans, longest first. */
	columnRuns(x: number): Array<[number, number]> {
		return runs(this.height, (y) => this.isInk(x, y));
	}
}

// Alpha below this is "not drawn": the antialiased fringe of a shape, or nothing.
const OPAQUE = 128;
// Luminance distance (0..255) from the background that counts as ink. A staff line's
// antialiased edge sits closer than this; its core is well past it on any theme.
const CONTRAST = 64;

function luminance(data: Buffer, at: number): number {
	return (
		0.299 * (data[at] ?? 0) +
		0.587 * (data[at + 1] ?? 0) +
		0.114 * (data[at + 2] ?? 0)
	);
}

function runs(
	length: number,
	inkAt: (i: number) => boolean,
): Array<[number, number]> {
	const found: Array<[number, number]> = [];
	let start = -1;
	for (let i = 0; i <= length; i++) {
		const ink = i < length && inkAt(i);
		if (ink && start < 0) {
			start = i;
		} else if (!ink && start >= 0) {
			found.push([start, i]);
			start = -1;
		}
	}
	return found.sort((a, b) => b[1] - b[0] - (a[1] - a[0]));
}
