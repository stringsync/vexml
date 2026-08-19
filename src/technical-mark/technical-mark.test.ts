import { describe, expect, it } from 'bun:test';
import { FakeTechnicalMark } from './fake-technical-mark';
import { isTechnicalMark } from './technical-mark';

describe('isTechnicalMark', () => {
	it('recognizes a technical mark', () => {
		expect(isTechnicalMark(new FakeTechnicalMark())).toBe(true);
	});

	it('passes over the other modifiers a note carries', () => {
		expect(isTechnicalMark({ kind: 'lyric' })).toBe(false);
		expect(isTechnicalMark({ below: true })).toBe(false);
		expect(isTechnicalMark(null)).toBe(false);
		expect(isTechnicalMark(undefined)).toBe(false);
	});
});

describe('FakeTechnicalMark', () => {
	it('records the baseline and ink it was pinned with', () => {
		const mark = new FakeTechnicalMark({
			below: true,
			rowHeight: 16,
			width: 8,
		});
		expect(mark.baselineY).toBeNull();
		mark.setBaselineY(90);
		mark.setStyle({ fillStyle: '#abcdef' });
		expect(mark.baselineY).toBe(90);
		expect(mark.fillStyle).toBe('#abcdef');
		expect(mark.rowHeight()).toBe(16);
		expect(mark.getWidth()).toBe(8);
		expect(mark.below).toBe(true);
	});

	it('reports the top edge it was drawn at', () => {
		expect(new FakeTechnicalMark({ top: 42 }).getBoundingBox().getY()).toBe(42);
	});
});
