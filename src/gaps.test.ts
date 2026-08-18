import { describe, expect, it } from 'bun:test';
import { Gaps } from './gaps';
import { gap, parts } from './gaps-harness';

describe('Gaps', () => {
	it('inserts an empty, unnumbered measure into every part, shifting indexes but not numbers', () => {
		const ps = parts();
		new Gaps([gap(1)]).insertInto(ps);
		for (const part of ps) {
			expect(part.measures).toHaveLength(3);
			expect(part.measures[1]?.notes).toHaveLength(0);
			expect(part.measures[1]?.number).toBe('');
			expect(part.measures.map((m) => m.number)).toEqual(['1', '', '2']);
		}
	});

	it("a leading gap copies its right neighbor's clef/key/time per part", () => {
		const ps = parts();
		new Gaps([gap(0)]).insertInto(ps);
		const [p1, p2] = ps;
		expect(p1?.measures[0]?.getClef('1')?.sign).toBe('G');
		expect(p1?.measures[0]?.getKey('1')?.fifths).toBe(2);
		expect(p1?.measures[0]?.getTime('1')?.beats).toBe('4');
		expect(p2?.measures[0]?.getClef('1')?.sign).toBe('F');
	});

	it('an appended gap inherits its signature by carry-forward', () => {
		const ps = parts();
		new Gaps([gap(2)]).insertInto(ps);
		expect(ps[0]?.measures).toHaveLength(3);
		expect(ps[0]?.measures[2]?.notes).toHaveLength(0);
		expect(ps[0]?.measures[2]?.getClef('1')?.sign).toBe('G');
	});

	it("multiple gaps land at documentIndexes' positions", () => {
		const ps = parts();
		const gaps = new Gaps([gap(1), gap(0)]);
		gaps.insertInto(ps);
		expect(ps[0]?.measures.map((m) => m.number)).toEqual(['', '1', '', '2']);
		expect(
			gaps.documentIndexes().map(({ measureIndex }) => measureIndex),
		).toEqual([2, 0]);
	});

	it('rejects an out-of-range index or a non-positive duration', () => {
		expect(() => new Gaps([gap(3)]).insertInto(parts())).toThrow(RangeError);
		expect(() => new Gaps([gap(-1)]).insertInto(parts())).toThrow(RangeError);
		expect(() => new Gaps([gap(0, 0)]).insertInto(parts())).toThrow(RangeError);
	});

	it('maps caller indexes to shifted document indexes, preserving config order', () => {
		expect(new Gaps([gap(4), gap(0), gap(0)]).documentIndexes()).toEqual([
			{ gap: gap(4), measureIndex: 6 },
			{ gap: gap(0), measureIndex: 0 },
			{ gap: gap(0), measureIndex: 1 },
		]);
	});

	it('keys byMeasureIndex on the shifted document indexes', () => {
		const byIndex = new Gaps([gap(4), gap(0)]).byMeasureIndex();
		expect([...byIndex.keys()].sort((a, b) => a - b)).toEqual([0, 5]);
		expect(byIndex.get(0)).toEqual(gap(0));
		expect(byIndex.get(5)).toEqual(gap(4));
	});

	it('inserting no gaps leaves the parts untouched', () => {
		const ps = parts();
		new Gaps([]).insertInto(ps);
		expect(ps[0]?.measures.map((m) => m.number)).toEqual(['1', '2']);
	});
});
