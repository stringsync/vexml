import { describe, expect, it } from 'bun:test';
import { STAVE_CLEARANCE } from './constants';
import { SpillResolver } from './spill-resolver';
import type { StaveSpill } from './spill-tracker';

// Staff lines 40px below the stave's y and 40px tall — a plain 5-line notation stave.
// Spill is columned by x; `column` says which one it sits over, so two staves can be given
// content that shares an x or content that never does. Zero extents are left out, matching
// what bandSpill records.
function spill(rise: number, drop: number, column = 0): StaveSpill {
	return {
		rise: new Map(rise > 0 ? [[column, rise]] : []),
		drop: new Map(drop > 0 ? [[column, drop]] : []),
		lineTop: 40,
		lineBottom: 80,
	};
}

// The offsets resolved for a one-system score whose rows spilled as given.
function offsets(
	planned: number[],
	rows: Array<[number, StaveSpill]>,
): number[] | undefined {
	return new SpillResolver()
		.spacedOffsets(planned, new Map([[0, new Map(rows)]]))
		.get(0);
}

describe('SpillResolver', () => {
	it('leaves planned offsets alone when the music fits the planned gap', () => {
		// Planned gap 120; the staves need 80 + 0 + 12 + 0 - 40 = 52.
		expect(
			offsets(
				[0, 120],
				[
					[0, spill(0, 0)],
					[1, spill(0, 0)],
				],
			),
		).toEqual([0, 120]);
	});

	it('widens a gap the music outgrows, to exactly the clearance', () => {
		const gap = offsets(
			[0, 120],
			[
				[0, spill(0, 50)], // upper stave hangs 50px below its bottom line
				[1, spill(60, 0)], // lower stave rises 60px above its top line
			],
		)?.[1];
		expect(gap).toBe(80 + 50 + STAVE_CLEARANCE + 60 - 40);
		// The widened gap really does leave STAVE_CLEARANCE between the two:
		// lower stave's content top minus upper stave's content bottom.
		expect((gap ?? 0) + 40 - 60 - (80 + 50)).toBe(STAVE_CLEARANCE);
	});

	it('only adds up spill the two staves have at the same x', () => {
		const rows: Array<[number, StaveSpill]> = [
			[0, spill(0, 50, 0)], // upper stave hangs 50px below, over column 0
			[1, spill(60, 0, 99)], // lower stave rises 60px, way off at column 99
		];
		// Neither reaches into the other's column, so the gap holds the deeper of the two
		// (60) rather than their sum (110) — and that fits inside the planned 120.
		expect(offsets([0, 120], rows)).toEqual([0, 120]);
		expect(offsets([0, 80], rows)?.[1]).toBe(80 + 60 + STAVE_CLEARANCE - 40);
	});

	it('accumulates widened gaps down the system', () => {
		// Both gaps grow by the same 42, so the third stave shifts down by twice that.
		expect(
			offsets(
				[0, 120, 240],
				[
					[0, spill(0, 50)],
					[1, spill(60, 50)],
					[2, spill(60, 0)],
				],
			),
		).toEqual([0, 162, 324]);
	});

	it('keeps the planned gap for a row it has no measurement for', () => {
		expect(offsets([0, 120], [])).toEqual([0, 120]);
	});

	it('widens every gap planned the same size, not just the one that outgrew it', () => {
		// Gap 1 needs 80 + 0 + 12 + 60 - 40 = 112; gap 2 needs only 52. Both were planned
		// at 80, so both end up 112 and the three staves stay evenly spaced.
		expect(
			offsets(
				[0, 80, 160],
				[
					[0, spill(0, 0)],
					[1, spill(60, 0)], // only the middle stave carries content above its lines
					[2, spill(0, 0)],
				],
			),
		).toEqual([0, 112, 224]);
	});

	it('leaves a differently sized planned gap out of it', () => {
		// Gap 1 (planned 120, a part's inner gap) grows to 112 -> stays 120; gap 2
		// (planned 80, between parts) needs only 52, and nothing of its size grew.
		expect(
			offsets(
				[0, 120, 200],
				[
					[0, spill(0, 0)],
					[1, spill(60, 0)],
					[2, spill(0, 0)],
				],
			),
		).toEqual([0, 120, 200]);
	});

	it('spaces each system from its own music', () => {
		const resolved = new SpillResolver().spacedOffsets(
			[0, 80],
			new Map([
				// System 0 is plain — its staves stay where they were planned.
				[
					0,
					new Map([
						[0, spill(0, 0)],
						[1, spill(0, 0)],
					]),
				],
				// System 1 has a run hanging below the upper stave into the lower one's.
				[
					1,
					new Map([
						[0, spill(0, 50)],
						[1, spill(60, 0)],
					]),
				],
			]),
		);
		expect(resolved.get(0)).toEqual([0, 80]);
		expect(resolved.get(1)).toEqual([0, 80 + 50 + STAVE_CLEARANCE + 60 - 40]);
	});

	// A pass report whose four redraw triggers are all quiet; tests flip one at a time.
	const quietReport = {
		observedStaveSpill: new Map([
			[
				0,
				new Map([
					[0, spill(0, 0)],
					[1, spill(0, 0)],
				]),
			],
		]),
		observedOverflow: new Map<number, number>(),
		lyricsStepped: false,
		voltasLifted: false,
	};

	it('lets a quiet first pass stand', () => {
		const revision = new SpillResolver().revise([0, 120], quietReport, 2);
		expect(revision.needed).toBe(false);
		expect(revision.grewBy).toBe(0);
	});

	it('asks for a redraw when a gap had to widen, reporting the growth', () => {
		const revision = new SpillResolver().revise(
			[0, 80],
			{
				...quietReport,
				observedStaveSpill: new Map([
					[
						0,
						new Map([
							[0, spill(0, 50)],
							[1, spill(60, 0)],
						]),
					],
				]),
			},
			1,
		);
		expect(revision.needed).toBe(true);
		expect(revision.grewBy).toBe(50 + STAVE_CLEARANCE + 60 - 40);
	});

	it('treats top overflow as a trigger only when a system sits above', () => {
		const overflowing = {
			...quietReport,
			observedOverflow: new Map([[1, 30]]),
		};
		expect(new SpillResolver().revise([0, 120], overflowing, 1).needed).toBe(
			false,
		);
		expect(new SpillResolver().revise([0, 120], overflowing, 2).needed).toBe(
			true,
		);
	});

	it('redraws for a stepped lyric verse or a climbed-through volta', () => {
		expect(
			new SpillResolver().revise(
				[0, 120],
				{ ...quietReport, lyricsStepped: true },
				1,
			).needed,
		).toBe(true);
		expect(
			new SpillResolver().revise(
				[0, 120],
				{ ...quietReport, voltasLifted: true },
				1,
			).needed,
		).toBe(true);
	});
});
