import { describe, expect, it } from 'bun:test';
import { FontFamilies } from './font-families';

describe('FontFamilies', () => {
	it('leaves legitimate family names and urls untouched', () => {
		expect(FontFamilies.sanitize('Source Sans 3')).toBe('Source Sans 3');
		expect(FontFamilies.sanitize('Times New Roman')).toBe('Times New Roman');
		expect(FontFamilies.sanitize('/fonts/inter.woff2')).toBe(
			'/fonts/inter.woff2',
		);
		expect(FontFamilies.sanitize('https://x.test/a-b_c.woff2?v=1')).toBe(
			'https://x.test/a-b_c.woff2?v=1',
		);
	});

	it('removes characters that break out of a quoted CSS string', () => {
		const attack =
			"Bravura'; } body { background: url(//evil) } @font-face { font-family: 'x";
		expect(FontFamilies.sanitize(attack)).not.toMatch(/['"\\<>]/);
		expect(FontFamilies.sanitize('a"<b>\\c\nd')).toBe('abcd');
	});

	it('falls back to the configured defaults, and takes an override as given', () => {
		expect(new FontFamilies()).toMatchObject({
			notation: 'Bravura',
			text: 'Source Sans 3',
		});
		expect(new FontFamilies({ text: { family: 'Inter' } })).toMatchObject({
			notation: 'Bravura',
			text: 'Inter',
		});
	});
});
