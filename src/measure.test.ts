import { describe, expect, it } from 'bun:test';
import { measureOf } from './measure-harness';

describe('Measure', () => {
	it('exposes its printed number and stable index', () => {
		const { measure } = measureOf();
		expect(measure.getNumber()).toBe('1');
		expect(measure.getIndex()).toBe(0);
	});

	it('links up to its part and across to its layout box and system', () => {
		const { measure } = measureOf();
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
		const { measure, mmeasure } = measureOf();
		expect(measure.getSources()).toEqual([mmeasure]);
	});
});
