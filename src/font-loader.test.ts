// biome-ignore-all lint/suspicious/noExplicitAny: minimal DOM mocks for unit testing
import { expect, test } from 'bun:test';
import { loadFonts, sanitizeFontValue } from './font-loader';

test('sanitizeFontValue leaves legitimate family names and urls untouched', () => {
	expect(sanitizeFontValue('Source Sans 3')).toBe('Source Sans 3');
	expect(sanitizeFontValue('Times New Roman')).toBe('Times New Roman');
	expect(sanitizeFontValue('/fonts/inter.woff2')).toBe('/fonts/inter.woff2');
	expect(sanitizeFontValue('https://x.test/a-b_c.woff2?v=1')).toBe(
		'https://x.test/a-b_c.woff2?v=1',
	);
});

test('sanitizeFontValue removes characters that break out of a quoted CSS string', () => {
	const attack =
		"Bravura'; } body { background: url(//evil) } @font-face { font-family: 'x";
	expect(sanitizeFontValue(attack)).not.toMatch(/['"\\<>]/);
	expect(sanitizeFontValue('a"<b>\\c\nd')).toBe('abcd');
});

// SSR safety: no document → must not throw, no container mutation needed.
test('SSR guard: no throw without document', () => {
	const orig = globalThis.document;
	// @ts-expect-error
	globalThis.document = undefined;
	expect(() => loadFonts({ style: { setProperty() {} } } as any)).not.toThrow();
	globalThis.document = orig;
});

// Fake minimal DOM to exercise injection + dedup + container scoping.
function fakeDom() {
	const head: any[] = [];
	const vars: Record<string, string> = {};
	(globalThis as any).document = {
		head: { appendChild: (n: any) => head.push(n) },
		createElement: (tag: string) => ({ tag, style: {}, textContent: '' }),
	};
	const container = {
		style: {
			setProperty: (k: string, v: string) => {
				vars[k] = v;
			},
		},
	} as any;
	return { head, vars, container };
}

test('default render injects bravura + google fonts, scopes vars to container', () => {
	const { head, vars, container } = fakeDom();
	loadFonts(container);
	// 1 google <link> + 1 bravura <style>
	expect(head.filter((n) => n.tag === 'link').length).toBe(1);
	expect(head.filter((n) => n.tag === 'style').length).toBe(1);
	expect(vars['--vexml-font-notation']).toBe("'Bravura', serif");
	expect(vars['--vexml-font-text']).toBe("'Source Sans 3', sans-serif");
});

test('idempotent: second default call injects nothing new', () => {
	const { head, container } = fakeDom();
	loadFonts(container); // dedup sets persist across calls in-module
	const after = head.length;
	loadFonts(container);
	expect(head.length).toBe(after); // no new tags
});

test('custom notation url injects that url, not bundled path', () => {
	const { head, container } = fakeDom();
	loadFonts(container, {
		notation: { family: 'Bravura', url: '/static/Custom.woff2' },
	});
	const styleText = head
		.filter((n) => n.tag === 'style')
		.map((n) => n.textContent)
		.join('');
	expect(styleText).toContain('/static/Custom.woff2');
});
