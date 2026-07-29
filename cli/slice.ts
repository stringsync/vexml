import { readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, isAbsolute, resolve } from 'node:path';
import {
	MDOMParser,
	MElement,
	type Measure,
	type MNode,
	MusicXMLSerializer,
} from '@stringsync/mdom';

export async function slice(opts: {
	input: string;
	measures: string;
	output?: string;
	cwd: string;
}) {
	// index.ts chdir'd to the repo root, so resolve user paths against their cwd.
	const at = (p: string) => (isAbsolute(p) ? p : resolve(opts.cwd, p));
	const input = at(opts.input);
	const stem = basename(input, extname(input));
	const output = at(opts.output ?? `${stem}.slice.musicxml`);

	let sliced: string;
	try {
		sliced = sliceMusicXML(readFileSync(input, 'utf8'), opts.measures);
	} catch (e) {
		// A bad -m is user error, not a crash; no stack trace.
		console.error(`vex slice: ${e instanceof Error ? e.message : e}`);
		process.exit(1);
	}

	writeFileSync(output, sliced);
	console.log(`wrote ${output}`);
}

/**
 * Keep only the measures named by `spec` (e.g. `1,3-5,8`), matching on the
 * `<measure number>` label. The kept opening measure inherits the signatures
 * that were in effect where the slice starts, so it still renders correctly on
 * its own.
 *
 * Spanners are deliberately left as they fall: a tie, slur, wedge, or repeat
 * barline crossing a cut stays half-open. For a minimal repro that is usually
 * what you want to see, and stitching them closed is where the complexity is.
 */
export function sliceMusicXML(xml: string, spec: string): string {
	const wanted = parseMeasureSpec(spec);
	const doc = new MDOMParser().parseFromString(xml);

	for (const part of doc.score.parts) {
		const measures = part.measures;
		const [first] = measures.filter((m) => wanted.has(m.number));
		if (!first) {
			throw new Error(`part ${part.id} has no measures matching "${spec}"`);
		}
		hoistAttributes(measures, first);
		for (const measure of measures) {
			if (!wanted.has(measure.number)) {
				measure.remove();
			}
		}
	}

	return new MusicXMLSerializer().serializeToString(doc);
}

/** `1,3-5,8` -> {1, 3, 4, 5, 8}. Ranges are numeric; bare tokens stay literal. */
export function parseMeasureSpec(spec: string): Set<string> {
	const out = new Set<string>();
	for (const token of spec.split(',')) {
		const part = token.trim();
		if (part === '') {
			throw new Error(`empty measure in "${spec}"`);
		}
		// Only a-b is a range; a bare token is a literal label, since <measure
		// number> is free-form (pickup measures are "0", repeats reuse numbers).
		const range = /^(\d+)-(\d+)$/.exec(part);
		if (!range) {
			out.add(part);
			continue;
		}
		const [from, to] = [Number(range[1]), Number(range[2])];
		if (to < from) {
			throw new Error(`descending measure range "${part}"`);
		}
		for (let n = from; n <= to; n++) {
			out.add(String(n));
		}
	}
	return out;
}

/**
 * `<attributes>` child order, from the XSD sequence. Unlisted tags sort last.
 * The slice re-sorts because inherited children are appended, not placed.
 */
const ATTRIBUTE_ORDER = [
	'footnote',
	'level',
	'divisions',
	'key',
	'time',
	'staves',
	'part-symbol',
	'instruments',
	'clef',
	'staff-details',
	'transpose',
	'for-part',
	'directive',
	'measure-style',
];

/** Attributes that stay in effect until replaced, so a slice has to carry them in. */
const CARRIED = new Set([
	'divisions',
	'key',
	'time',
	'staves',
	'part-symbol',
	'instruments',
	'clef',
	'staff-details',
	'transpose',
]);

/** Carried attributes with one score-wide value, rather than one per staff. */
const GLOBAL = new Set(['divisions', 'staves', 'part-symbol', 'instruments']);

/**
 * Copy into `first` every carried attribute that was in effect just before it —
 * the signatures the dropped measures established. Walks backward, nearest wins,
 * and never overwrites what `first` already declares.
 */
function hoistAttributes(measures: Measure[], first: Measure): void {
	// Value null marks a key `first` already declares: claimed, but nothing to copy.
	const inherited = new Map<string, MElement | null>();
	// A numberless key/time/staff-details/transpose applies to every staff, so once
	// the nearest one is found nothing further back in that tag can still apply.
	const sealed = new Set<string>();

	const collect = (block: MElement, own: boolean) => {
		for (const child of block.children) {
			if (!(child instanceof MElement) || !CARRIED.has(child.tag)) {
				continue;
			}
			const number = child.getAttribute('number');
			// Clefs are the exception to numberless-means-all-staves: they match a
			// single staff exactly, defaulting to the first.
			const staff = child.tag === 'clef' ? (number ?? '1') : (number ?? '*');
			const key = GLOBAL.has(child.tag) ? child.tag : `${child.tag}:${staff}`;
			if (sealed.has(child.tag) || inherited.has(key)) {
				continue;
			}
			inherited.set(key, own ? null : child);
			if (staff === '*' && !GLOBAL.has(child.tag)) {
				sealed.add(child.tag);
			}
		}
	};

	for (const block of leadingAttributes(first)) {
		collect(block, true);
	}
	// Nearest first: later measures before earlier ones, and within a measure a
	// mid-measure change before the one that opened it.
	const earlier = measures.slice(0, measures.indexOf(first)).reverse();
	for (const measure of earlier) {
		for (const block of measure.childrenNamed('attributes').reverse()) {
			collect(block, false);
		}
	}

	const target = leadingAttributes(first)[0] ?? openAttributes(first);
	for (const child of inherited.values()) {
		if (child) {
			target.append(child);
		}
	}
	sortChildren(target);
}

/**
 * The `<attributes>` blocks in effect at the start of `measure`. A block after
 * the first note is a mid-measure change and must not suppress what the measure
 * inherits — the measure still opens with the old signature.
 */
function leadingAttributes(measure: Measure): MElement[] {
	const blocks: MElement[] = [];
	for (const child of measure.children) {
		if (!(child instanceof MElement)) {
			continue;
		}
		if (child.tag === 'note') {
			break;
		}
		if (child.tag === 'attributes') {
			blocks.push(child);
		}
	}
	return blocks;
}

/** Add an empty `<attributes>` ahead of the measure's notes. */
function openAttributes(measure: Measure): MElement {
	const block = new MElement('attributes');
	const firstNote =
		measure.children.find((c) => c instanceof MElement && c.tag === 'note') ??
		null;
	measure.insertBefore(block, firstNote);
	return block;
}

/** Reorder children into the schema sequence, stably (same-tag order is kept). */
function sortChildren(block: MElement): void {
	const rank = (node: MNode) => {
		const i = node instanceof MElement ? ATTRIBUTE_ORDER.indexOf(node.tag) : -1;
		return i === -1 ? ATTRIBUTE_ORDER.length : i;
	};
	const sorted = block.children
		.map((node, i) => ({ node, i }))
		.sort((a, b) => rank(a.node) - rank(b.node) || a.i - b.i);
	for (const { node } of sorted) {
		block.append(node);
	}
}
