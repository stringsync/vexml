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

describe('FakeLyricMark', () => {
	it('records the baseline and ink it was pinned with', () => {
		const lyric = new FakeLyricMark(1, { width: 30, extend: true });
		expect(lyric.baselineY).toBeNull();
		lyric.setBaselineY(200);
		lyric.setStyle({ fillStyle: '#123456' });
		expect(lyric.baselineY).toBe(200);
		expect(lyric.fillStyle).toBe('#123456');
		expect(lyric.getWidth()).toBe(30);
		expect(lyric.extend).toBe(true);
	});

	it('renumbers its verse when a voice shifts it', () => {
		const lyric = new FakeLyricMark(1);
		lyric.shiftVerses(2);
		expect(lyric.verseIndex).toBe(3);
	});
});
