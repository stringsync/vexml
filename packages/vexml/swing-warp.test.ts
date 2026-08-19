import { describe, expect, it } from 'bun:test';
import { SwingWarp } from './swing-warp';

describe('SwingWarp', () => {
	const SWUNG = { first: 2, second: 1, unit: 0.5 };
	// A full 4/4 measure: no pickup, so the grid is unphased.
	const FULL = { playedBeats: 4, meterBeats: 4 };

	it('holds the pair boundaries fixed and pushes the off-beat late', () => {
		const warp = new SwingWarp(SWUNG, {
			playedBeats: 4,
			meterBeats: 4,
		});
		expect(warp.at(0)).toBeCloseTo(0);
		expect(warp.at(0.5)).toBeCloseTo(2 / 3);
		expect(warp.at(1)).toBeCloseTo(1);
		expect(warp.at(1.5)).toBeCloseTo(5 / 3);
		// The measure keeps its length, so tempo segments and bar starts never drift.
		expect(warp.at(4)).toBeCloseTo(4);
	});

	it('phases the grid off the downbeat, so a pickup eighth plays SHORT', () => {
		// One eighth of pickup in 3/4: that note is the OFF-beat of the pair landing on beat 1,
		// so it is the squeezed half (1/3 of a quarter). Phased off the measure's own start
		// instead, it would come out 2/3 — stretched, exactly backwards.
		const warp = new SwingWarp(SWUNG, {
			playedBeats: 0.5,
			meterBeats: 3,
		});
		expect(warp.at(0)).toBeCloseTo(0);
		expect(warp.at(0.5)).toBeCloseTo(1 / 3);
	});

	it('is identity for straight time and for no swing at all', () => {
		expect(
			new SwingWarp({ first: 1, second: 1, unit: 0.5 }, FULL).at(0.5),
		).toBe(0.5);
		expect(new SwingWarp(null, FULL).at(0.5)).toBe(0.5);
	});

	it('swings 16ths on the finer grid, leaving the eighths where they are', () => {
		const warp = new SwingWarp({ first: 2, second: 1, unit: 0.25 }, FULL);
		expect(warp.at(0.25)).toBeCloseTo(1 / 3);
		expect(warp.at(0.5)).toBeCloseTo(0.5);
	});
});
