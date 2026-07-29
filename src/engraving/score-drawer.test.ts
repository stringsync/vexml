import { describe, expect, it } from 'bun:test';
import { STAVE_CLEARANCE } from '../constants';
import type { StaveSpill } from './draw-pass';
import { spacedOffsets } from './score-drawer';

// Staff lines 40px below the stave's y and 40px tall — a plain 5-line notation stave.
function spill(rise: number, drop: number): StaveSpill {
	return { rise, drop, lineTop: 40, lineBottom: 80 };
}

describe('spacedOffsets', () => {
	it('leaves planned offsets alone when the music fits the planned gap', () => {
		const spills = new Map([
			[0, spill(0, 0)],
			[1, spill(0, 0)],
		]);
		// Planned gap 120; the staves need 80 + 0 + 12 + 0 - 40 = 52.
		expect(spacedOffsets([0, 120], spills)).toEqual([0, 120]);
	});

	it('widens a gap the music outgrows, to exactly the clearance', () => {
		const spills = new Map([
			[0, spill(0, 50)], // upper stave hangs 50px below its bottom line
			[1, spill(60, 0)], // lower stave rises 60px above its top line
		]);
		const [, gap] = spacedOffsets([0, 120], spills);
		expect(gap).toBe(80 + 50 + STAVE_CLEARANCE + 60 - 40);
		// The widened gap really does leave STAVE_CLEARANCE between the two:
		// lower stave's content top minus upper stave's content bottom.
		expect((gap ?? 0) + 40 - 60 - (80 + 50)).toBe(STAVE_CLEARANCE);
	});

	it('accumulates widened gaps down the system', () => {
		const spills = new Map([
			[0, spill(0, 50)],
			[1, spill(60, 50)],
			[2, spill(60, 0)],
		]);
		// Both gaps grow by the same 42, so the third stave shifts down by twice that.
		expect(spacedOffsets([0, 120, 240], spills)).toEqual([0, 162, 324]);
	});

	it('keeps the planned gap for a row it has no measurement for', () => {
		expect(spacedOffsets([0, 120], new Map())).toEqual([0, 120]);
	});

	it('widens every gap planned the same size, not just the one that outgrew it', () => {
		const spills = new Map([
			[0, spill(0, 0)],
			[1, spill(60, 0)], // only the middle stave carries content above its lines
			[2, spill(0, 0)],
		]);
		// Gap 1 needs 80 + 0 + 12 + 60 - 40 = 112; gap 2 needs only 52. Both were planned
		// at 80, so both end up 112 and the three staves stay evenly spaced.
		expect(spacedOffsets([0, 80, 160], spills)).toEqual([0, 112, 224]);
	});

	it('leaves a differently sized planned gap out of it', () => {
		const spills = new Map([
			[0, spill(0, 0)],
			[1, spill(60, 0)],
			[2, spill(0, 0)],
		]);
		// Gap 1 (planned 120, a part's inner gap) grows to 112 -> stays 120; gap 2
		// (planned 80, between parts) needs only 52, and nothing of its size grew.
		expect(spacedOffsets([0, 120, 200], spills)).toEqual([0, 120, 200]);
	});
});
