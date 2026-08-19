import { beforeEach, describe, expect, it } from 'bun:test';
import type { Measure as MMeasure } from '@stringsync/mdom';
import { MDOMParser } from '@stringsync/mdom';
import type { Measure } from './measure';
import { measureFixture } from './measure-fixture';
import { FakeViewport } from './viewport/fake-viewport';

/* A one-part, one-measure, one-note score: the smallest thing that still builds a real Measure. */
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

describe('Measure', () => {
	let measure: Measure;
	let mmeasure: MMeasure;

	beforeEach(() => {
		const mpart = new MDOMParser().parseFromString(XML).score.parts[0];
		const first = mpart?.measures[0];
		if (!mpart || !first) {
			throw new Error('fixture: missing measure');
		}
		mmeasure = first;
		measure = measureFixture(mpart, mmeasure, new FakeViewport());
	});

	it('exposes its printed number and stable index', () => {
		expect(measure.getNumber()).toBe('1');
		expect(measure.getIndex()).toBe(0);
	});

	it('links up to its part and across to its layout box and system', () => {
		expect(measure.getPart().getId()).toBe('P1');
		expect(measure.getPart().getLabel()).toBe('M');
		expect(measure.getPart().getMeasures()).toEqual([measure]);
		expect(measure.getBox().getIndex()).toBe(0);
		expect(measure.getBox().getMeasures()).toEqual([measure]);
		expect(measure.getBox().getSystem().getMeasureBoxes()).toEqual([
			measure.getBox(),
		]);
	});

	it('traces back to the single mdom measure it wraps', () => {
		expect(measure.getSources()).toEqual([mmeasure]);
	});
});
