import { describe, expect, it } from 'bun:test';
import { Rect } from './geometry';

describe('Rect', () => {
	it('right/bottom derive from x/y/w/h', () => {
		const r = new Rect(10, 20, 30, 40);
		expect(r.right).toBe(40);
		expect(r.bottom).toBe(60);
	});

	it('intersects is strict — overlapping rects hit, edge-touching does not', () => {
		const a = new Rect(0, 0, 10, 10);
		expect(a.intersects(new Rect(5, 5, 10, 10))).toBe(true);
		// Shares only the right edge (x=10): not an intersection.
		expect(a.intersects(new Rect(10, 0, 10, 10))).toBe(false);
		// Shares only the bottom edge (y=10): not an intersection.
		expect(a.intersects(new Rect(0, 10, 10, 10))).toBe(false);
		// Fully disjoint.
		expect(a.intersects(new Rect(100, 100, 1, 1))).toBe(false);
	});

	it('intersection returns the overlap rect or null', () => {
		const a = new Rect(0, 0, 10, 10);
		const ov = a.intersection(new Rect(6, 4, 10, 10));
		expect(ov).not.toBeNull();
		expect([ov?.x, ov?.y, ov?.w, ov?.h]).toEqual([6, 4, 4, 6]);
		expect(a.intersection(new Rect(10, 10, 5, 5))).toBeNull();
	});

	it('contains is inclusive of edges', () => {
		const outer = new Rect(0, 0, 100, 100);
		expect(outer.contains(new Rect(10, 10, 10, 10))).toBe(true);
		expect(outer.contains(new Rect(0, 0, 100, 100))).toBe(true); // exact fit
		expect(outer.contains(new Rect(95, 95, 10, 10))).toBe(false); // spills right/bottom
		expect(outer.contains(new Rect(-1, 0, 10, 10))).toBe(false); // spills left
	});

	it('translate returns a shifted copy without mutating the original', () => {
		const a = new Rect(1, 2, 3, 4);
		const b = a.translate(10, -5);
		expect([b.x, b.y, b.w, b.h]).toEqual([11, -3, 3, 4]);
		expect([a.x, a.y]).toEqual([1, 2]); // unchanged
	});

	it('fromBoundingBox reads the vexflow accessors', () => {
		const bb = { getX: () => 5, getY: () => 6, getW: () => 7, getH: () => 8 };
		const r = Rect.fromBoundingBox(bb as never);
		expect([r.x, r.y, r.w, r.h]).toEqual([5, 6, 7, 8]);
	});
});
