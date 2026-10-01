import { describe, expect, it } from 'bun:test';
import { Rect } from 'webappwiz/geometry';
import { Affine } from './affine';

describe('Affine', () => {
	it('applies the right-hand transform first, as canvas transform() does', () => {
		// scale(2) then translate(10, 0): the translation is scaled too.
		const m = Affine.scale(2).multiply(Affine.translate(10, 0));
		expect(m.mapBox(0, 0, 0, 0)).toEqual(new Rect(20, 0, 0, 0));
	});

	it('maps a box to the box around its turned corners', () => {
		const quarter = new Affine(0, 1, -1, 0, 0, 0); // rotate(90deg)
		expect(quarter.mapBox(0, 0, 10, 4)).toEqual(new Rect(-4, 0, 4, 10));
	});

	it('maps a box given corner first or corner last the same', () => {
		const m = new Affine(1, 0, 0, -1, 5, 5);
		expect(m.mapBox(10, 10, 0, 0)).toEqual(m.mapBox(0, 0, 10, 10));
	});

	it('reports the longest stretch of a unit length', () => {
		expect(Affine.scale(2, 3).maxScale).toBe(3);
	});

	it('is axis aligned only without rotation or skew', () => {
		expect(Affine.scale(2).multiply(Affine.translate(1, 1)).isAxisAligned).toBe(
			true,
		);
		expect(new Affine(1, 0.5, 0, 1, 0, 0).isAxisAligned).toBe(false);
	});
});
