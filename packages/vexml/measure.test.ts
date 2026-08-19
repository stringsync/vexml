import { beforeEach, describe, expect, it } from 'bun:test';
import type { Measure as MMeasure } from '@stringsync/mdom';
import { MDocument } from '@stringsync/mdom';
import { Rect } from 'webappwiz/geometry';
import { FakeViewport } from './fake-viewport';
import { Measure } from './measure';
import { MeasureBox } from './measure-box';
import { Part } from './part';
import { System } from './system';

/* A one-part, one-measure, one-note score: the smallest thing that still builds a real Measure. */
function fixture() {
	const mpart = MDocument.empty().score.addPart({ id: 'P1', name: 'M' });
	const mmeasure = mpart.addMeasure();
	mmeasure
		.getOrCreateVoice('1')
		.addNote({ step: 'C', octave: 4, type: 'quarter' });
	return { mpart, mmeasure };
}

describe('Measure', () => {
	let measure: Measure;
	let mmeasure: MMeasure;

	beforeEach(() => {
		const { mpart, mmeasure: first } = fixture();
		mmeasure = first;

		// The links run both ways, so each owner is built around the array it will later be
		// filled with: System <- MeasureBox <- Measure -> Part, then the measure pushed back in.
		// That is what the tests below walk.
		const viewport = new FakeViewport();
		const rect = new Rect(0, 0, 100, 50);
		const boxes: MeasureBox[] = [];
		const boxMeasures: Measure[] = [];
		const partMeasures: Measure[] = [];
		const box = new MeasureBox(
			rect,
			viewport,
			mmeasure.number,
			mmeasure.index,
			[mmeasure],
			new System(rect, viewport, 0, boxes),
			boxMeasures,
		);
		boxes.push(box);
		measure = new Measure(mmeasure, new Part(mpart, partMeasures), box, []);
		boxMeasures.push(measure);
		partMeasures.push(measure);
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
