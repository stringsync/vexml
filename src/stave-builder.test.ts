import { describe, expect, it } from 'bun:test';
import { showsMeasureNumber } from './stave-builder';

describe('StaveBuilder', () => {
	it('shows no measure numbers under none', () => {
		expect(showsMeasureNumber('none', 0, true)).toBe(false);
	});

	it('numbers only system starts under system', () => {
		expect(showsMeasureNumber('system', 3, true)).toBe(true);
		expect(showsMeasureNumber('system', 3, false)).toBe(false);
	});

	it('numbers every measure under every', () => {
		expect(showsMeasureNumber('every', 3, false)).toBe(true);
	});

	it('numbers every Nth measure plus system starts under every-N', () => {
		expect(showsMeasureNumber('every-2', 2, false)).toBe(true);
		expect(showsMeasureNumber('every-2', 3, false)).toBe(false);
		expect(showsMeasureNumber('every-2', 3, true)).toBe(true);
		expect(showsMeasureNumber('every-3', 3, false)).toBe(true);
		expect(showsMeasureNumber('every-3', 4, false)).toBe(false);
	});
});
