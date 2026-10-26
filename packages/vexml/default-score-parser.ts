import {
	MDOMParser,
	MDocument,
	MElement,
	type MNode,
	MText,
	MusicXMLSerializer,
} from '@stringsync/mdom';
import type { ScoreParser } from './score-parser';

export class DefaultScoreParser implements ScoreParser {
	async parse(input: string | Blob | MDocument): Promise<MDocument> {
		if (input instanceof MDocument) {
			return input;
		}
		const parser = new MDOMParser();
		let document: MDocument;
		if (typeof input === 'string') {
			document = parser.parseFromString(input);
		} else if (input instanceof Blob) {
			document = await parser.parseFromBlob(input);
		} else {
			throw new TypeError('render: input is not a string, Blob or MDocument');
		}
		if (document.root.tag !== 'score-timewise') {
			return document;
		}
		const partwise = toPartwise(document);
		return parser.parseFromString(
			new MusicXMLSerializer().serializeToString(partwise),
		);
	}
}

/**
 * Regroups a timewise score (measure > part) as a partwise one (part > measure). The score header
 * moves over unchanged; each measure keeps its attributes and gets one copy per part.
 */
const toPartwise = (document: MDocument): MDocument => {
	const timewise = document.root;
	const root = new MElement('score-partwise');
	for (const [name, value] of Object.entries(timewise.attributes)) {
		root.setAttribute(name, value);
	}
	const parts = new Map<string, MElement>();
	for (const child of timewise.children) {
		if (!(child instanceof MElement) || child.tag !== 'measure') {
			root.append(clone(child));
		}
	}
	for (const measure of timewise.childrenNamed('measure')) {
		for (const part of measure.childrenNamed('part')) {
			const id = part.getAttribute('id') ?? '';
			let target = parts.get(id);
			if (!target) {
				target = new MElement('part');
				target.setAttribute('id', id);
				parts.set(id, target);
				root.append(target);
			}
			const copy = new MElement('measure');
			for (const [name, value] of Object.entries(measure.attributes)) {
				copy.setAttribute(name, value);
			}
			for (const content of part.children) {
				copy.append(clone(content));
			}
			target.append(copy);
		}
	}
	return new MDocument(root, document.declaration, null);
};

// mdom refuses to move a node between documents, so the new tree is built from copies. A CDATA
// section comes across as plain text, which the serializer escapes to the same content.
const clone = (node: MNode): MNode => {
	if (!(node instanceof MElement)) {
		return new MText((node as MText).value);
	}
	const copy = new MElement(node.tag);
	for (const [name, value] of Object.entries(node.attributes)) {
		copy.setAttribute(name, value);
	}
	for (const child of node.children) {
		copy.append(clone(child));
	}
	return copy;
};
