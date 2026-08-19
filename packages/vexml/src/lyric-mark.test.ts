import { describe, expect, it } from 'bun:test';
import { FakeLyricMark } from './fake-lyric-mark';
import { isLyricMark } from './lyric-mark';

describe('isLyricMark', () => {
	it('recognizes a lyric', () => {
		expect(isLyricMark(new FakeLyricMark(0))).toBe(true);
	});

	it('passes over the other modifiers a note carries', () => {
		expect(isLyricMark({ kind: 'technical' })).toBe(false);
		expect(isLyricMark({ verseIndex: 0 })).toBe(false);
		expect(isLyricMark(null)).toBe(false);
		expect(isLyricMark(undefined)).toBe(false);
	});
});
