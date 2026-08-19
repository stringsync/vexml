import { readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, isAbsolute, resolve } from 'node:path';
import { MeasureSlicer } from './measure-slicer';

export interface SliceOptions {
	input: string;
	/* Which measures to keep, e.g. `1,3-5,8`. */
	measures: string;
	/* Defaults to `<input stem>.slice.musicxml` beside the input. */
	output?: string;
	/* Where the user ran `vex`; index.ts chdir'd to the repo root, so relative
	 * paths resolve against this. */
	cwd: string;
}

export async function slice(opts: SliceOptions) {
	// index.ts chdir'd to the repo root, so resolve user paths against their cwd.
	const at = (p: string) => (isAbsolute(p) ? p : resolve(opts.cwd, p));
	const input = at(opts.input);
	const stem = basename(input, extname(input));
	const output = at(opts.output ?? `${stem}.slice.musicxml`);

	let sliced: string;
	try {
		sliced = new MeasureSlicer(opts.measures).slice(
			readFileSync(input, 'utf8'),
		);
	} catch (e) {
		// A bad -m is user error, not a crash; no stack trace.
		console.error(`vex slice: ${e instanceof Error ? e.message : e}`);
		process.exit(1);
	}

	writeFileSync(output, sliced);
	console.log(`wrote ${output}`);
}
