import { readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, isAbsolute, resolve } from 'node:path';
import { MDOMParser, MusicXMLSerializer } from '@stringsync/mdom';

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
		first.materializeSignatures();
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
