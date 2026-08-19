import { basename, extname, isAbsolute, resolve } from 'node:path';
import type { Logger } from 'webappwiz/log';
import type { Fs } from 'webappwiz/system';
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
	log: Logger;
	fs: Fs;
}

export async function slice(opts: SliceOptions) {
	// index.ts chdir'd to the repo root, so resolve user paths against their cwd.
	const at = (p: string) => (isAbsolute(p) ? p : resolve(opts.cwd, p));
	const input = at(opts.input);
	const stem = basename(input, extname(input));
	const output = at(opts.output ?? `${stem}.slice.musicxml`);

	// A bad --measures throws, which the cli reports as one line and no stack
	// trace: user error, not a crash.
	const sliced = new MeasureSlicer(opts.measures).slice(
		await opts.fs.read(input),
	);

	await opts.fs.write(output, sliced);
	opts.log.info(`wrote ${output}`);
}
