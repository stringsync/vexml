import { describe, expect, it } from 'bun:test';
import { FakeTechnicalMark } from './fake-technical-mark';
import { isTechnicalMark } from './technical-mark';

describe('isTechnicalMark', () => {
	it('recognizes a technical mark', () => {
		expect(isTechnicalMark(new FakeTechnicalMark({}))).toBe(true);
	});

	it('passes over the other modifiers a note carries', () => {
		expect(isTechnicalMark({ kind: 'lyric' })).toBe(false);
		expect(isTechnicalMark({ below: true })).toBe(false);
		expect(isTechnicalMark(null)).toBe(false);
		expect(isTechnicalMark(undefined)).toBe(false);
	});
});
