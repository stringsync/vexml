import { describe, expect, it } from 'bun:test';
import { MDOMParser, type Part } from '@stringsync/mdom';
import type { Gap } from './config';
import { Gaps } from './gaps';

/* A two-part, two-measure score: the smallest thing a gap can be inserted into that still
 * has signatures to carry across the cut and a second part to keep in step. */
const GAPS_XML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>A</part-name></score-part>
    <score-part id="P2"><part-name>B</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>2</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <clef><sign>F</sign><line>4</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
  </part>
</score-partwise>`;

function parts(): Part[] {
	return new MDOMParser().parseFromString(GAPS_XML).score.parts;
}

const gap = (beforeMeasureIndex: number, durationMs = 1000): Gap => ({
	beforeMeasureIndex,
	durationMs,
});

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
