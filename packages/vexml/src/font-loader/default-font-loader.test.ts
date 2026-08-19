// biome-ignore-all lint/suspicious/noExplicitAny: minimal DOM mocks for unit testing
import { describe, expect, it } from 'bun:test';
import { DefaultFontLoader } from './default-font-loader';

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
