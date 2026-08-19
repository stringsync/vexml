import { describe, expect, it } from 'bun:test';
import { parseMeasureSpec } from './slice';

describe('parseMeasureSpec', () => {
	it('expands a mix of singles and ranges', () => {
		expect([...parseMeasureSpec('1,3-5,8')]).toEqual(['1', '3', '4', '5', '8']);
	});

	it('tolerates whitespace and duplicates', () => {
		expect([...parseMeasureSpec(' 2 , 1-3 ')]).toEqual(['2', '1', '3']);
	});

	it('keeps a non-numeric label literal', () => {
		expect([...parseMeasureSpec('X1')]).toEqual(['X1']);
	});

	it('rejects an empty measure', () => {
		expect(() => parseMeasureSpec('1,,2')).toThrow();
	});

	it('rejects a descending range', () => {
		expect(() => parseMeasureSpec('5-3')).toThrow();
	});
});
