import { describe, expect, it } from 'bun:test';
import { PNG } from 'pngjs';
import { InkMap } from './ink-map';

describe('InkMap', () => {
	it('reads dark pixels on a light background as ink', () => {
		const png = pngOf(4, 2, [255, 255, 255, 255], [[1, 0, [0, 0, 0, 255]]]);
		const ink = InkMap.fromPng(png);
		expect(ink.isInk(1, 0)).toBe(true);
		expect(ink.isInk(0, 0)).toBe(false);
		expect(ink.isInk(2, 1)).toBe(false);
	});

	it('reads light pixels on a dark background as ink', () => {
		const png = pngOf(4, 2, [20, 20, 20, 255], [[3, 1, [240, 240, 240, 255]]]);
		expect(InkMap.fromPng(png).isInk(3, 1)).toBe(true);
	});

	it('reads any opaque pixel on a transparent background as ink', () => {
		const png = pngOf(4, 2, [0, 0, 0, 0], [[2, 0, [255, 255, 255, 255]]]);
		expect(InkMap.fromPng(png).isInk(2, 0)).toBe(true);
	});

	it('ignores the antialiased fringe near the background color', () => {
		const png = pngOf(
			4,
			2,
			[255, 255, 255, 255],
			[[1, 1, [220, 220, 220, 255]]],
		);
		expect(InkMap.fromPng(png).isInk(1, 1)).toBe(false);
	});

	it('is blank when nothing was drawn', () => {
		expect(InkMap.fromPng(pngOf(3, 3, [255, 255, 255, 255], [])).isBlank).toBe(
			true,
		);
	});

	it('lists a row’s ink runs longest first', () => {
		const ink = InkMap.fromRows(['.#..####.']);
		expect(ink.rowRuns(0)).toEqual([
			[4, 8],
			[1, 2],
		]);
	});

	it('lists a column’s ink runs longest first', () => {
		const ink = InkMap.fromRows(['#', '.', '#', '#', '.']);
		expect(ink.columnRuns(0)).toEqual([
			[2, 4],
			[0, 1],
		]);
	});
});

function pngOf(
	width: number,
	height: number,
	background: number[],
	pixels: Array<[number, number, number[]]>,
): Buffer {
	const png = new PNG({ width, height });
	for (let i = 0; i < width * height; i++) {
		png.data.set(background, i * 4);
	}
	for (const [x, y, rgba] of pixels) {
		png.data.set(rgba, (y * width + x) * 4);
	}
	return PNG.sync.write(png);
}
