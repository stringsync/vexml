import { beforeEach, describe, expect, it } from 'bun:test';
import { Rect } from 'core/geometry';
import { describeMeasures, MeasureMap } from './measure-map';

describe('MeasureMap', () => {
	let map: MeasureMap;

	beforeEach(() => {
		// Two systems of two measures: 1 and 2 on top, 3 and 4 under them.
		map = new MeasureMap([
			{ number: '1', box: new Rect(20, 40, 100, 40) },
			{ number: '2', box: new Rect(120, 40, 100, 40) },
			{ number: '3', box: new Rect(20, 140, 100, 41) },
			{ number: '4', box: new Rect(120, 140, 100, 40) },
		]);
	});

	it('names the measure a box lies in', () => {
		expect(map.numbersAt(new Rect(150, 50, 10, 10))).toEqual(['2']);
	});

	it('names every measure a box spans, in score order', () => {
		expect(map.numbersAt(new Rect(100, 150, 100, 2))).toEqual(['3', '4']);
	});

	it('names the nearest measures for ink outside them all', () => {
		// Clipped at the top edge, over measure 1 alone.
		expect(map.numbersAt(new Rect(30, 0, 20, 1))).toEqual(['1']);
		// Clipped at the left edge beside the second system.
		expect(map.numbersAt(new Rect(0, 150, 1, 20))).toEqual(['3']);
	});

	it('names nothing when there are no measures to name', () => {
		expect(new MeasureMap([]).numbersAt(new Rect(0, 0, 1, 1))).toEqual([]);
	});

	it('reads one measure, a run, and numbers that are not a run', () => {
		expect(describeMeasures(['3'])).toBe('measure 3');
		expect(describeMeasures(['3', '4', '5'])).toBe('measures 3-5');
		expect(describeMeasures(['1', '4', '5', 'X1'])).toBe('measures 1, 4-5, X1');
		expect(describeMeasures([])).toBe('');
	});
});
