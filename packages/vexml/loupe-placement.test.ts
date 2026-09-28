import { describe, expect, it } from 'bun:test';
import { placeLoupe } from './loupe-placement';

const LOUPE = { width: 200, height: 100, gap: 10 };
const PHONE = { left: 0, top: 0, width: 400, height: 800 };
// A cursor bar spanning a system, 2px wide at x 150.
const bar = (top: number) => ({ left: 149, top, right: 151 });

describe('placeLoupe', () => {
	it('floats gap above the anchor, centered on the magnified point', () => {
		expect(placeLoupe(LOUPE, bar(300), { x: 150, y: 350 }, PHONE)).toEqual({
			left: 50,
			top: 190,
		});
	});

	it('slides sideways to stay within the viewport while above', () => {
		expect(placeLoupe(LOUPE, bar(300), { x: 20, y: 350 }, PHONE).left).toBe(0);
		expect(placeLoupe(LOUPE, bar(300), { x: 390, y: 350 }, PHONE).left).toBe(
			200,
		);
	});

	it('sits right of the anchor, level with the point, when there is no room above', () => {
		expect(placeLoupe(LOUPE, bar(50), { x: 150, y: 100 }, PHONE)).toEqual({
			left: 161,
			top: 50,
		});
	});

	it('sits left of the anchor when the right has no room', () => {
		const anchor = { left: 299, top: 50, right: 301 };
		expect(placeLoupe(LOUPE, anchor, { x: 300, y: 100 }, PHONE)).toEqual({
			left: 89,
			top: 50,
		});
	});

	it('pins to the right edge when neither side has room', () => {
		const anchor = { left: 199, top: 50, right: 201 };
		expect(placeLoupe(LOUPE, anchor, { x: 200, y: 100 }, PHONE)).toEqual({
			left: 200,
			top: 50,
		});
	});

	it('keeps a side loupe within the viewport vertically', () => {
		expect(placeLoupe(LOUPE, bar(0), { x: 150, y: 10 }, PHONE).top).toBe(0);
	});

	it('stays within a pinch-zoomed viewport, offset from the client origin', () => {
		const zoomed = { left: 300, top: 400, width: 250, height: 300 };
		// Above the anchor, slid right into the visible part of the page.
		expect(placeLoupe(LOUPE, bar(600), { x: 150, y: 650 }, zoomed)).toEqual({
			left: 300,
			top: 490,
		});
		// No room above the visible top, nor either side: against the visible right edge.
		const anchor = { left: 399, top: 420, right: 401 };
		expect(placeLoupe(LOUPE, anchor, { x: 400, y: 410 }, zoomed)).toEqual({
			left: 350,
			top: 400,
		});
	});

	it('pins a loupe wider than the viewport to its left edge', () => {
		const narrow = { left: 0, top: 0, width: 150, height: 800 };
		expect(placeLoupe(LOUPE, bar(300), { x: 100, y: 350 }, narrow).left).toBe(
			0,
		);
	});
});
