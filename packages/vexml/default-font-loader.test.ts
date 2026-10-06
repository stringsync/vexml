// biome-ignore-all lint/suspicious/noExplicitAny: minimal DOM mocks for unit testing
import { afterEach, describe, expect, it } from 'bun:test';
import { DefaultFontLoader } from './default-font-loader';

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
			new DefaultFontLoader().load({ style: { setProperty() {} } } as any),
		).not.toThrow();
	});

	it('injects google fonts only and scopes vars to the container by default', async () => {
		const { head, vars, container } = fakeDom();
		await new DefaultFontLoader().load(container);
		// 1 google <link> for Source Sans 3; Bravura comes from VexFlow, so no <style>.
		expect(head.filter((n) => n.tag === 'link').length).toBe(1);
		expect(head.filter((n) => n.tag === 'style').length).toBe(0);
		expect(vars['--vexml-font-notation']).toBe("'Bravura', serif");
		expect(vars['--vexml-font-text']).toBe("'Source Sans 3', sans-serif");
	});

	it('injects nothing new on a second default call', async () => {
		const { head, container } = fakeDom();
		await new DefaultFontLoader().load(container); // dedup markers persist on the document
		const after = head.length;
		await new DefaultFontLoader().load(container); // fresh loader, same document: still deduped
		expect(head.length).toBe(after); // no new tags
	});

	it('injects a custom notation url, not the bundled path', async () => {
		const { head, container } = fakeDom();
		await new DefaultFontLoader().load(container, {
			notation: { family: 'Bravura', url: '/static/Custom.woff2' },
		});
		const styleText = head
			.filter((n) => n.tag === 'style')
			.map((n) => n.textContent)
			.join('');
		expect(styleText).toContain('/static/Custom.woff2');
	});
});

// Fake minimal DOM to exercise injection + dedup + container scoping.
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
