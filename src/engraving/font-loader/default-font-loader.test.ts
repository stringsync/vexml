// biome-ignore-all lint/suspicious/noExplicitAny: minimal DOM mocks for unit testing
import { describe, expect, it } from 'bun:test';
import { DefaultFontLoader, sanitizeFontValue } from './default-font-loader';
import { fakeDom } from './font-loader-harness';

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

describe('DefaultFontLoader', () => {
	// SSR safety: no document → must not throw, no container mutation needed.
	it('SSR guard: no throw without document', () => {
		const orig = globalThis.document;
		// @ts-expect-error
		globalThis.document = undefined;
		expect(() =>
			new DefaultFontLoader().load({ style: { setProperty() {} } } as any),
		).not.toThrow();
		globalThis.document = orig;
	});

	it('default render injects google fonts only, scopes vars to container', () => {
		const { head, vars, container } = fakeDom();
		new DefaultFontLoader().load(container);
		// 1 google <link> for Source Sans 3; Bravura comes from VexFlow, so no <style>.
		expect(head.filter((n) => n.tag === 'link').length).toBe(1);
		expect(head.filter((n) => n.tag === 'style').length).toBe(0);
		expect(vars['--vexml-font-notation']).toBe("'Bravura', serif");
		expect(vars['--vexml-font-text']).toBe("'Source Sans 3', sans-serif");
	});

	it('idempotent: second default call injects nothing new', () => {
		const { head, container } = fakeDom();
		new DefaultFontLoader().load(container); // dedup markers persist on the document
		const after = head.length;
		new DefaultFontLoader().load(container); // fresh loader, same document: still deduped
		expect(head.length).toBe(after); // no new tags
	});

	it('custom notation url injects that url, not bundled path', () => {
		const { head, container } = fakeDom();
		new DefaultFontLoader().load(container, {
			notation: { family: 'Bravura', url: '/static/Custom.woff2' },
		});
		const styleText = head
			.filter((n) => n.tag === 'style')
			.map((n) => n.textContent)
			.join('');
		expect(styleText).toContain('/static/Custom.woff2');
	});
});
