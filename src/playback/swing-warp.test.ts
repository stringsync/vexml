import { describe, expect, it } from 'bun:test';
import { swingWarp } from './sequence-factory';

describe('swingWarp', () => {
	const SWUNG = { first: 2, second: 1, unit: 0.5 };

	it('holds the pair boundaries fixed and pushes the off-beat late', () => {
		const warp = swingWarp(SWUNG, 4, 4);
		expect(warp(0)).toBeCloseTo(0);
		expect(warp(0.5)).toBeCloseTo(2 / 3);
		expect(warp(1)).toBeCloseTo(1);
		expect(warp(1.5)).toBeCloseTo(5 / 3);
		// The measure keeps its length, so tempo segments and bar starts never drift.
		expect(warp(4)).toBeCloseTo(4);
	});

	it('phases the grid off the downbeat, so a pickup eighth plays SHORT', () => {
		// One eighth of pickup in 3/4: that note is the OFF-beat of the pair landing on beat 1,
		// so it is the squeezed half (1/3 of a quarter). Phased off the measure's own start
		// instead, it would come out 2/3 — stretched, exactly backwards.
		const warp = swingWarp(SWUNG, 0.5, 3);
		expect(warp(0)).toBeCloseTo(0);
		expect(warp(0.5)).toBeCloseTo(1 / 3);
	});

	it('is identity for straight time and for no swing at all', () => {
		expect(swingWarp({ first: 1, second: 1, unit: 0.5 }, 4, 4)(0.5)).toBe(0.5);
		expect(swingWarp(null, 4, 4)(0.5)).toBe(0.5);
	});

	it('swings 16ths on the finer grid, leaving the eighths where they are', () => {
		const warp = swingWarp({ first: 2, second: 1, unit: 0.25 }, 4, 4);
		expect(warp(0.25)).toBeCloseTo(1 / 3);
		expect(warp(0.5)).toBeCloseTo(0.5);
	});
});
