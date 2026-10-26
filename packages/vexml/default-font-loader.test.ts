// biome-ignore-all lint/suspicious/noExplicitAny: minimal DOM mocks for unit testing
import { afterEach, describe, expect, it } from 'bun:test';
import { DEFAULT_CONFIG } from './config';
import { DefaultFontLoader } from './default-font-loader';

const BRAVURA = '/assets/Bravura-abc123.woff2';

describe('DefaultFontLoader', () => {
	const realDocument = globalThis.document;

	// Put the real document back: VexFlow caches a text-measurement canvas built from
	// whatever document is installed the first time anything measures text, so a fake
	// left behind here fails every later test in the run that engraves a note.
	afterEach(() => {
		globalThis.document = realDocument;
	});

	// SSR safety: no document → must not throw, no container mutation needed.
	it('does not throw without a document (SSR guard)', () => {
		// @ts-expect-error
		globalThis.document = undefined;
		expect(() =>
			new DefaultFontLoader(BRAVURA).load({
				style: { setProperty() {} },
			} as any),
		).not.toThrow();
	});

	it('injects the shipped bravura and google fonts, scoping vars to the container by default', async () => {
		const { head, vars, container } = fakeDom();
		await new DefaultFontLoader(BRAVURA).load(container);
		// 1 google <link> for Source Sans 3, 1 <style> for the shipped Bravura.
		expect(head.filter((n) => n.tag === 'link').length).toBe(1);
		expect(styleText(head)).toContain(`url('${BRAVURA}') format('woff2')`);
		expect(head.filter((n) => n.tag === 'style').length).toBe(1);
		expect(vars['--vexml-font-notation']).toBe("'Bravura', serif");
		expect(vars['--vexml-font-text']).toBe("'Source Sans 3', sans-serif");
	});

	it('loads google fonts under the default config', async () => {
		const { head, container } = fakeDom();
		await new DefaultFontLoader(BRAVURA).load(container, DEFAULT_CONFIG.fonts);
		expect(head.filter((n) => n.tag === 'link').length).toBe(1);
	});

	it('injects no text font for a named family without a url', async () => {
		const { head, container } = fakeDom();
		await new DefaultFontLoader(BRAVURA).load(container, {
			text: { family: 'Source Sans 3' },
		});
		expect(head.filter((n) => n.tag === 'link').length).toBe(0);
	});

	it('loads google fonts when the text config only sets a color', async () => {
		const { head, container } = fakeDom();
		await new DefaultFontLoader(BRAVURA).load(container, {
			text: { color: 'red' },
		});
		expect(head.filter((n) => n.tag === 'link').length).toBe(1);
	});

	it('injects nothing new on a second default call', async () => {
		const { head, container } = fakeDom();
		await new DefaultFontLoader(BRAVURA).load(container); // dedup markers persist on the document
		const after = head.length;
		await new DefaultFontLoader(BRAVURA).load(container); // fresh loader, same document: still deduped
		expect(head.length).toBe(after); // no new tags
	});

	it('injects a custom notation url, not the bundled path', async () => {
		const { head, container } = fakeDom();
		await new DefaultFontLoader(BRAVURA).load(container, {
			notation: { family: 'Bravura', url: '/static/Custom.woff2' },
		});
		expect(styleText(head)).toContain('/static/Custom.woff2');
		expect(styleText(head)).not.toContain(BRAVURA);
		expect(head.filter((n) => n.tag === 'style').length).toBe(1);
	});

	it('injects one face per file of a split notation family, each with its range', async () => {
		const { head, container } = fakeDom();
		await new DefaultFontLoader(BRAVURA).load(container, {
			notation: {
				family: 'Bravura',
				faces: [
					{ url: '/fonts/common.woff2', unicodeRange: 'U+E050-E062, U+E0A4' },
					{ url: '/fonts/full.woff2' },
				],
			},
		});
		const styles = head.filter((n) => n.tag === 'style');
		expect(styles).toHaveLength(2);
		expect(styles[0].textContent).toContain('/fonts/common.woff2');
		expect(styles[0].textContent).toContain(
			'unicode-range: U+E050-E062, U+E0A4;',
		);
		expect(styles[0].textContent).toContain('font-display: block');
		expect(styles[1].textContent).toContain('/fonts/full.woff2');
		expect(styles[1].textContent).not.toContain('unicode-range');
		expect(styleText(head)).not.toContain(BRAVURA);
	});

	it('injects the files of a split text family', async () => {
		const { head, container } = fakeDom();
		await new DefaultFontLoader(BRAVURA).load(container, {
			text: {
				family: 'Inter',
				faces: [
					{ url: '/fonts/inter-latin.woff2', unicodeRange: 'U+0000-00FF' },
					{ url: '/fonts/inter-ext.woff2' },
				],
			},
		});
		expect(head.filter((n) => n.tag === 'link')).toHaveLength(0);
		expect(styleText(head)).toContain('/fonts/inter-latin.woff2');
		expect(styleText(head)).toContain('/fonts/inter-ext.woff2');
	});

	it('ensures nothing had to load when every face is resident', async () => {
		const { fonts } = fakeFonts([{ status: 'loaded' }]);
		expect(
			await new DefaultFontLoader(BRAVURA).ensure([
				{ font: '30pt Bravura', text: '\uE566' },
			]),
		).toBe(false);
		expect(fonts.loads).toEqual([]);
	});

	it('ensures a measured glyph whose face had to load', async () => {
		const { fonts, faces } = fakeFonts([
			{ status: 'loaded' },
			{ status: 'unloaded' },
		]);
		const rare = faces[1];
		fonts.answer = () => {
			rare.status = 'loaded';
			return [rare];
		};
		expect(
			await new DefaultFontLoader(BRAVURA).ensure([
				{ font: '30pt Bravura', text: '\uE566' },
			]),
		).toBe(true);
		expect(fonts.loads).toEqual([['30pt Bravura', '\uE566']]);
	});

	it('ensures nothing had to load when the measured glyphs need only resident faces', async () => {
		const { fonts, faces } = fakeFonts([
			{ status: 'loaded' },
			{ status: 'unloaded' },
		]);
		fonts.answer = () => [faces[0]];
		expect(
			await new DefaultFontLoader(BRAVURA).ensure([
				{ font: '30pt Bravura', text: '\uE050' },
			]),
		).toBe(false);
	});

	it('ensures past a face that fails to load', async () => {
		const { fonts } = fakeFonts([{ status: 'unloaded' }]);
		fonts.answer = () => {
			throw new Error('404');
		};
		expect(
			await new DefaultFontLoader(BRAVURA).ensure([
				{ font: '30pt Bravura', text: '\uE566' },
			]),
		).toBe(false);
	});

	it('loads the shipped bravura when the notation config only sets a color', async () => {
		const { head, container } = fakeDom();
		await new DefaultFontLoader(BRAVURA).load(container, {
			notation: { color: 'red' },
		});
		expect(styleText(head)).toContain(BRAVURA);
	});

	it('injects nothing for another notation family without a url', async () => {
		const { head, container } = fakeDom();
		await new DefaultFontLoader(BRAVURA).load(container, {
			notation: { family: 'Petaluma' },
		});
		expect(head.filter((n) => n.tag === 'style').length).toBe(0);
	});
});

function styleText(head: any[]): string {
	return head
		.filter((n) => n.tag === 'style')
		.map((n) => n.textContent)
		.join('');
}

// Fake minimal DOM to exercise injection + dedup + container scoping.
// document.fonts with the given faces; `answer` decides what a load resolves with.
function fakeFonts(faces: Array<{ status: string }>) {
	const fonts = {
		loads: [] as string[][],
		answer: (): Array<{ status: string }> => [],
		forEach(callback: (face: { status: string }) => void) {
			faces.forEach(callback);
		},
		async load(font: string, text: string) {
			this.loads.push([font, text]);
			return this.answer();
		},
	};
	(globalThis as any).document = { fonts };
	return { fonts, faces: faces as any[] };
}

function fakeDom() {
	const head: any[] = [];
	const vars: Record<string, string> = {};
	(globalThis as any).document = {
		head: {
			appendChild: (n: any) => head.push(n),
			// Minimal attribute-selector matching for the data-* dedup markers.
			querySelector: (selector: string) => {
				const match = selector.match(/^(\w+)\[([\w-]+)(?:="([^"]*)")?\]$/);
				if (!match) {
					return null;
				}
				const [, tag, attr, value] = match;
				if (!tag || !attr) {
					return null;
				}
				return (
					head.find(
						(n) =>
							n.tag === tag &&
							attr in n.attrs &&
							(value === undefined || n.attrs[attr] === value),
					) ?? null
				);
			},
		},
		createElement: (tag: string) => ({
			tag,
			style: {},
			textContent: '',
			attrs: {} as Record<string, string>,
			setAttribute(name: string, value: string) {
				this.attrs[name] = value;
			},
			addEventListener() {},
		}),
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
