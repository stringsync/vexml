import { describe, expect, it } from 'bun:test';
import { AlphatabAttribution } from './alphatab-attribution';

describe('AlphatabAttribution', () => {
	it('labels distinct glyph draws inside beat groups and closes after early returns', () => {
		const calls: string[] = [];
		const canvas = {
			beginGroup: (kind: string) => calls.push(kind),
			endGroup: () => calls.push('close'),
			fillText: (text: string) => calls.push(text),
		};
		const source = `class NoteHeadGlyph {paint(x,y,canvas) {canvas.fillText('head',x,y);return 3;}} class TempoGlyph {paint(x,y,canvas) {canvas.fillText('tempo',x,y);}}`;
		expect(
			new Function(
				'canvas',
				`${AlphatabAttribution.instrument(source)};new NoteHeadGlyph().paint(0,0,canvas);new TempoGlyph().paint(0,0,canvas);`,
			)(canvas),
		).toBeUndefined();
		expect(calls).toEqual([
			'ink-NoteHeadGlyph',
			'head',
			'close',
			'ink-TempoGlyph',
			'tempo',
			'close',
		]);
	});
	it('does not change non-paint methods or methods that take no canvas', () => {
		const source =
			'class Example {paint(x) {return x;} layout(canvas) {return canvas;}}';
		expect(AlphatabAttribution.instrument(source)).toBe(source);
	});
});
