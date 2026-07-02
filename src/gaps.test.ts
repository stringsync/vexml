import { describe, expect, it } from 'bun:test';
import { MDOMParser, type Part } from '@stringsync/mdom';
import type { Gap } from './config';
import { gapDocumentIndexes, insertGapMeasures } from './gaps';

const XML = `<?xml version="1.0"?>
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
	return new MDOMParser().parseFromString(XML).score.parts;
}

const gap = (beforeMeasureIndex: number, durationMs = 1000): Gap => ({
	beforeMeasureIndex,
	durationMs,
});

describe('gapDocumentIndexes', () => {
	it('maps caller indexes to shifted document indexes, preserving config order', () => {
		expect(gapDocumentIndexes([gap(4), gap(0), gap(0)])).toEqual([
			{ gap: gap(4), measureIndex: 6 },
			{ gap: gap(0), measureIndex: 0 },
			{ gap: gap(0), measureIndex: 1 },
		]);
	});
});

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
