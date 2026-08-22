import { describe, expect, it } from 'bun:test';
import { MDocument, type Part } from '@stringsync/mdom';
import type { Gap } from './config';
import { Gaps } from './gaps';

/* A two-part, two-measure score: the smallest thing a gap can be inserted into that still
 * has signatures to carry across the cut and a second part to keep in step. */
function parts(): Part[] {
	const score = MDocument.empty().score;

	const treble = score.addPart({ id: 'P1', name: 'A' });
	const first = treble.addMeasure();
	first.setKey({ fifths: 2 });
	first.setTime({ beats: 4, beatType: 4 });
	first.setClef({ sign: 'G', line: 2 });
	for (const measure of [first, treble.addMeasure()]) {
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'whole' });
	}

	const bass = score.addPart({ id: 'P2', name: 'B' });
	const bassFirst = bass.addMeasure();
	bassFirst.setClef({ sign: 'F', line: 4 });
	for (const measure of [bassFirst, bass.addMeasure()]) {
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 3, type: 'whole' });
	}

	return score.parts;
}

const gap = (beforeMeasureIndex: number, durationMs: number): Gap => ({
	beforeMeasureIndex,
	durationMs,
});

describe('Gaps', () => {
	it('inserts an empty, unnumbered measure into every part, shifting indexes but not numbers', () => {
		const ps = parts();
		new Gaps([gap(1, 1000)]).insertInto(ps);
		for (const part of ps) {
			expect(part.measures).toHaveLength(3);
			expect(part.measures[1]?.notes).toHaveLength(0);
			expect(part.measures[1]?.number).toBe('');
			expect(part.measures.map((m) => m.number)).toEqual(['1', '', '2']);
		}
	});

	it("a leading gap copies its right neighbor's clef/key/time per part", () => {
		const ps = parts();
		new Gaps([gap(0, 1000)]).insertInto(ps);
		const [p1, p2] = ps;
		expect(p1?.measures[0]?.getClef('1')?.sign).toBe('G');
		expect(p1?.measures[0]?.getKey('1')?.fifths).toBe(2);
		expect(p1?.measures[0]?.getTime('1')?.beats).toBe('4');
		expect(p2?.measures[0]?.getClef('1')?.sign).toBe('F');
	});

	it('an appended gap inherits its signature by carry-forward', () => {
		const ps = parts();
		new Gaps([gap(2, 1000)]).insertInto(ps);
		expect(ps[0]?.measures).toHaveLength(3);
		expect(ps[0]?.measures[2]?.notes).toHaveLength(0);
		expect(ps[0]?.measures[2]?.getClef('1')?.sign).toBe('G');
	});

	it("multiple gaps land at documentIndexes' positions", () => {
		const ps = parts();
		const gaps = new Gaps([gap(1, 1000), gap(0, 1000)]);
		gaps.insertInto(ps);
		expect(ps[0]?.measures.map((m) => m.number)).toEqual(['', '1', '', '2']);
		expect(
			gaps.documentIndexes().map(({ measureIndex }) => measureIndex),
		).toEqual([2, 0]);
	});

	it('rejects an out-of-range index or a non-positive duration', () => {
		expect(() => new Gaps([gap(3, 1000)]).insertInto(parts())).toThrow(
			RangeError,
		);
		expect(() => new Gaps([gap(-1, 1000)]).insertInto(parts())).toThrow(
			RangeError,
		);
		expect(() => new Gaps([gap(0, 0)]).insertInto(parts())).toThrow(RangeError);
	});

	it('maps caller indexes to shifted document indexes, preserving config order', () => {
		expect(
			new Gaps([gap(4, 1000), gap(0, 1000), gap(0, 1000)]).documentIndexes(),
		).toEqual([
			{ gap: gap(4, 1000), measureIndex: 6 },
			{ gap: gap(0, 1000), measureIndex: 0 },
			{ gap: gap(0, 1000), measureIndex: 1 },
		]);
	});

	it('keys byMeasureIndex on the shifted document indexes', () => {
		const byIndex = new Gaps([gap(4, 1000), gap(0, 1000)]).byMeasureIndex();
		expect([...byIndex.keys()].sort((a, b) => a - b)).toEqual([0, 5]);
		expect(byIndex.get(0)).toEqual(gap(0, 1000));
		expect(byIndex.get(5)).toEqual(gap(4, 1000));
	});

	it('inserting no gaps leaves the parts untouched', () => {
		const ps = parts();
		new Gaps([]).insertInto(ps);
		expect(ps[0]?.measures.map((m) => m.number)).toEqual(['1', '2']);
	});
});
