/**
 * The elements a W3C XML Schema declares, and the attributes each one takes.
 *
 * Reads only the slice of XSD that MusicXML's schema uses to say which attributes
 * an element has: named and inline complex types, attribute groups, and the
 * extension bases they build on. Content models (sequence, choice, group) are
 * left alone: the coverage table counts elements, not where they may sit.
 */
export class XsdSchema {
	private readonly root: XsdNode;
	private readonly types = new Map<string, XsdNode>();
	private readonly groups = new Map<string, XsdNode>();

	constructor(xsd: string) {
		this.root = parseTags(xsd);
		// Named types and groups are only ever declared at the top of <xs:schema>.
		const top = this.root.children.flatMap((schema) => schema.children);
		for (const node of top) {
			const name = node.attrs.name;
			if (name && node.tag === 'complexType') {
				this.types.set(name, node);
			}
			if (name && node.tag === 'attributeGroup') {
				this.groups.set(name, node);
			}
		}
	}

	/**
	 * Every declared element name, mapped to the attributes it takes. A name
	 * declared more than once, as `<line>` or `<type>` are with different types in
	 * different parents, takes the union of all its declarations.
	 */
	elements(): Map<string, Set<string>> {
		const elements = new Map<string, Set<string>>();
		for (const node of descendants(this.root)) {
			const name = node.attrs.name;
			if (node.tag !== 'element' || !name) {
				continue;
			}
			const attributes = elements.get(name) ?? new Set<string>();
			for (const attribute of this.attributesOf(node)) {
				attributes.add(attribute);
			}
			elements.set(name, attributes);
		}
		return new Map([...elements].sort(([a], [b]) => a.localeCompare(b)));
	}

	private attributesOf(element: XsdNode): string[] {
		const type = element.attrs.type;
		const inline = element.children.find((c) => c.tag === 'complexType');
		const definition = inline ?? (type ? this.types.get(type) : undefined);
		return definition ? this.collect(definition, new Set()) : [];
	}

	// Walks a type's own declarations, never into the child elements it declares.
	private collect(node: XsdNode, seen: Set<XsdNode>): string[] {
		if (seen.has(node)) {
			return [];
		}
		seen.add(node);
		const found: string[] = [];
		for (const child of node.children) {
			if (child.tag === 'element') {
				continue;
			}
			if (child.tag === 'attribute') {
				const name = child.attrs.name ?? child.attrs.ref;
				if (name) {
					found.push(name);
				}
				continue;
			}
			const group = child.tag === 'attributeGroup' && child.attrs.ref;
			if (group) {
				const definition = this.groups.get(group);
				found.push(...(definition ? this.collect(definition, seen) : []));
				continue;
			}
			const base = child.tag === 'extension' && child.attrs.base;
			const definition = base ? this.types.get(base) : undefined;
			if (definition) {
				found.push(...this.collect(definition, seen));
			}
			found.push(...this.collect(child, seen));
		}
		return found;
	}
}

interface XsdNode {
	/** The local name, without the `xs:` prefix. */
	tag: string;
	attrs: Record<string, string>;
	children: XsdNode[];
}

// XSD is plain enough to read as a run of tags: text only ever sits in
// documentation, which nothing here reads.
function parseTags(xsd: string): XsdNode {
	const root: XsdNode = { tag: 'root', attrs: {}, children: [] };
	const stack = [root];
	const source = xsd.replace(/<!--[\s\S]*?-->/g, '');
	for (const match of source.matchAll(/<(\/?)xs:([\w-]+)([^>]*?)(\/?)>/g)) {
		const [, closing, tag = '', body = '', selfClosing] = match;
		if (closing) {
			stack.pop();
			continue;
		}
		const attrs: Record<string, string> = {};
		for (const [, key = '', value = ''] of body.matchAll(
			/([\w:-]+)="([^"]*)"/g,
		)) {
			attrs[key] = value;
		}
		const node: XsdNode = { tag, attrs, children: [] };
		stack.at(-1)?.children.push(node);
		if (!selfClosing) {
			stack.push(node);
		}
	}
	return root;
}

function descendants(node: XsdNode): XsdNode[] {
	return node.children.flatMap((child) => [child, ...descendants(child)]);
}
