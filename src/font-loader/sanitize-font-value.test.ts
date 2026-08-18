import { describe, expect, it } from 'bun:test';
import { sanitizeFontValue } from './sanitize-font-value';

describe('sanitizeFontValue', () => {
	it('leaves legitimate family names and urls untouched', () => {
		expect(sanitizeFontValue('Source Sans 3')).toBe('Source Sans 3');
		expect(sanitizeFontValue('Times New Roman')).toBe('Times New Roman');
		expect(sanitizeFontValue('/fonts/inter.woff2')).toBe('/fonts/inter.woff2');
		expect(sanitizeFontValue('https://x.test/a-b_c.woff2?v=1')).toBe(
			'https://x.test/a-b_c.woff2?v=1',
		);
	});

	it('removes characters that break out of a quoted CSS string', () => {
		const attack =
			"Bravura'; } body { background: url(//evil) } @font-face { font-family: 'x";
		expect(sanitizeFontValue(attack)).not.toMatch(/['"\\<>]/);
		expect(sanitizeFontValue('a"<b>\\c\nd')).toBe('abcd');
	});
});
