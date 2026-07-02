import { describe, expect, it } from 'bun:test';
import { MDOMParser } from '@stringsync/mdom';
import { Rect } from '../geometry';
import { FakeViewport } from '../testing/fake-viewport';
import { isHighlightable, isPlayable } from './element';
import type { Measure } from './measure';
import { MeasureBox } from './measure-box';
import { System } from './system';

const XML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;

function fixture() {
	const mdoc = new MDOMParser().parseFromString(XML);
	const mmeasure = mdoc.score.parts[0]?.measures[0];
	if (!mmeasure) {
		throw new Error('fixture: missing measure');
	}
	const viewport = new FakeViewport();
	const rect = new Rect(0, 0, 200, 100);
	const boxes: MeasureBox[] = [];
	const system = new System(rect, viewport, 0, boxes);
	const measures: Measure[] = [];
	const box = new MeasureBox(
		rect,
		viewport,
		'1',
		0,
		[mmeasure],
		system,
		measures,
	);
	boxes.push(box);
	return { box, system };
}

describe('MeasureBox', () => {
	it('exposes its printed number, stable index, and system', () => {
		const { box, system } = fixture();
		expect(box.getNumber()).toBe('1');
		expect(box.getIndex()).toBe(0);
		expect(box.type).toBe('measure');
		expect(box.getSystem()).toBe(system);
		expect(system.getMeasureBoxes()).toEqual([box]);
	});

	it('getSources returns the mdom measures it spans', () => {
		const { box } = fixture();
		expect(box.getSources()).toHaveLength(1);
		expect(box.getSources()[0]?.tag).toBe('measure');
	});

	it('is neither highlightable nor playable in v1', () => {
		const { box } = fixture();
		expect(isHighlightable(box)).toBe(false);
		expect(isPlayable(box)).toBe(false);
	});
});
