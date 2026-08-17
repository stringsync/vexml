import { describe, expect, it } from 'bun:test';
import { gapDocumentIndexes, insertGapMeasures } from './gaps';
import { gap, parts } from './gaps-harness';

describe('insertGapMeasures', () => {
	it('inserts an empty, unnumbered measure into every part, shifting indexes but not numbers', () => {
		const ps = parts();
		insertGapMeasures(ps, [gap(1)]);
		for (const part of ps) {
			expect(part.measures).toHaveLength(3);
			expect(part.measures[1]?.notes).toHaveLength(0);
			expect(part.measures[1]?.number).toBe('');
			expect(part.measures.map((m) => m.number)).toEqual(['1', '', '2']);
		}
	});

	it("a leading gap copies its right neighbor's clef/key/time per part", () => {
		const ps = parts();
		insertGapMeasures(ps, [gap(0)]);
		const [p1, p2] = ps;
		expect(p1?.measures[0]?.getClef('1')?.sign).toBe('G');
		expect(p1?.measures[0]?.getKey('1')?.fifths).toBe(2);
		expect(p1?.measures[0]?.getTime('1')?.beats).toBe('4');
		expect(p2?.measures[0]?.getClef('1')?.sign).toBe('F');
	});

	it('an appended gap inherits its signature by carry-forward', () => {
		const ps = parts();
		insertGapMeasures(ps, [gap(2)]);
		expect(ps[0]?.measures).toHaveLength(3);
		expect(ps[0]?.measures[2]?.notes).toHaveLength(0);
		expect(ps[0]?.measures[2]?.getClef('1')?.sign).toBe('G');
	});

	it("multiple gaps land at gapDocumentIndexes' positions", () => {
		const ps = parts();
		const gaps = [gap(1), gap(0)];
		insertGapMeasures(ps, gaps);
		expect(ps[0]?.measures.map((m) => m.number)).toEqual(['', '1', '', '2']);
		expect(
			gapDocumentIndexes(gaps).map(({ measureIndex }) => measureIndex),
		).toEqual([2, 0]);
	});

	it('rejects an out-of-range index or a non-positive duration', () => {
		expect(() => insertGapMeasures(parts(), [gap(3)])).toThrow(RangeError);
		expect(() => insertGapMeasures(parts(), [gap(-1)])).toThrow(RangeError);
		expect(() => insertGapMeasures(parts(), [gap(0, 0)])).toThrow(RangeError);
	});
});
