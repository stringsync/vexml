// biome-ignore-all lint/suspicious/noExplicitAny: minimal DOM mocks for unit testing

// Fake minimal DOM to exercise injection + dedup + container scoping.
export function fakeDom() {
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
