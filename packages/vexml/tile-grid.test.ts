import { beforeEach, describe, expect, it } from 'bun:test';
import { Rect } from 'webappwiz/geometry';
import { Affine } from './affine';
import type { PaintOp } from './paint-op';
import { PaintState } from './paint-state';
import { TileGrid } from './tile-grid';

describe('TileGrid', () => {
	let grid: TileGrid;

	beforeEach(() => {
		grid = new TileGrid(100, 100, 50);
	});

	it('files an op under every tile its box touches', () => {
		expect(grid.append(fill(40, 40, 20, 20))).toEqual([0, 1, 2, 3]);
	});

	it('files an unbounded op under every tile', () => {
		expect(grid.append({ ...fill(0, 0, 1, 1), bounds: null })).toEqual([
			0, 1, 2, 3,
		]);
	});

	it('cuts edge tiles short where the surface ends', () => {
		const shortGrid = new TileGrid(120, 70, 50);
		expect(shortGrid.tileRect(5)).toEqual(new Rect(100, 50, 20, 20));
	});

	it('shifts recorded boxes by its origin', () => {
		const shiftedGrid = new TileGrid(100, 100, 50, { x: 0, y: -50 });
		expect(shiftedGrid.append(fill(10, 60, 5, 5))).toEqual([0]);
	});

	it('empties a tile a clear covers, keeping no clear for it', () => {
		grid.append(fill(10, 10, 10, 10));
		grid.append(clear(0, 0, 50, 50));
		expect(grid.isEmpty(0)).toBe(true);
	});

	// scry-ignore simple-test-setup: covered/outside/partial are this test's own ops, each placed to exercise one clear; no other test shares them.
	it('keeps a partial clear and the ops it does not cover', () => {
		const covered = fill(10, 10, 10, 10);
		const outside = fill(30, 30, 10, 10);
		const partial = clear(0, 0, 25, 25);
		grid.append(covered);
		grid.append(outside);
		grid.append(partial);
		expect(grid.ops(0)).toEqual([outside, partial]);
	});

	it('drops an op from a tile where its part is cleared, and keeps it where not', () => {
		const spanning = fill(40, 10, 20, 10);
		grid.append(spanning);
		grid.append(clear(0, 0, 50, 50));
		expect(grid.ops(0)).toEqual([]);
		expect(grid.ops(1)).toEqual([spanning]);
	});

	it('prunes nothing under a clip that is not a rectangle', () => {
		const op = fill(10, 10, 10, 10);
		const state = PaintState.INITIAL.withClip({
			path: [],
			matrix: Affine.IDENTITY,
			fillRule: 'nonzero',
			rect: null,
		});
		grid.append(op);
		grid.append({ ...clear(0, 0, 50, 50), state });
		expect(grid.ops(0)).toContain(op);
	});

	it('gathers a region once per op, in paint order', () => {
		const first = fill(40, 40, 20, 20);
		const second = fill(0, 0, 5, 5);
		grid.append(first);
		grid.append(second);
		expect(grid.opsIn(new Rect(0, 0, 100, 100))).toEqual([first, second]);
	});
});

function fill(x: number, y: number, w: number, h: number): PaintOp {
	return {
		state: PaintState.INITIAL,
		path: null,
		call: { kind: 'fillRect', x, y, w, h },
		bounds: new Rect(x, y, w, h),
	};
}

function clear(x: number, y: number, w: number, h: number): PaintOp {
	return {
		state: PaintState.INITIAL,
		path: null,
		call: { kind: 'clearRect', x, y, w, h },
		bounds: new Rect(x, y, w, h),
	};
}
