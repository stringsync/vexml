import { describe, expect, it } from 'bun:test';
import { CssFont } from './css-font';

describe('CssFont', () => {
	it('reads the size in px and the families unquoted, in order', () => {
		const font = CssFont.parse("30pt 'Bravura','Source Sans 3',sans-serif");
		expect(font?.sizePx).toBe(40);
		expect(font?.size).toBe('30pt');
		expect(font?.families).toEqual(['Bravura', 'Source Sans 3', 'sans-serif']);
		expect(font?.weight).toBe(400);
		expect(font?.style).toBe('normal');
	});

	it('reads a style and a weight ahead of the size', () => {
		const font = CssFont.parse('italic bold 12px/1.5 "Times New Roman", serif');
		expect(font?.style).toBe('italic');
		expect(font?.weightName).toBe('bold');
		expect(font?.weight).toBe(700);
		expect(font?.sizePx).toBe(12);
		expect(font?.families).toEqual(['Times New Roman', 'serif']);
	});

	it('reads a numeric weight', () => {
		expect(CssFont.parse("600 10px 'Source Sans 3'")?.weight).toBe(600);
	});

	it('is null without a size it can read', () => {
		expect(CssFont.parse('Bravura')).toBeNull();
		expect(CssFont.parse('large serif')).toBeNull();
	});
});
