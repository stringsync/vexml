import { isAbsolute, resolve } from 'node:path';
import type { Ps } from 'webappwiz/system';

export interface ValidateOptions {
	input: string;
	/* Where the user ran `vex`; index.ts chdir'd to the repo root, so relative
	 * input paths resolve against this. */
	cwd: string;
	ps: Ps;
}

export async function validate(opts: ValidateOptions) {
	// index.ts chdir'd to the repo root, so resolve the user path against their cwd.
	const at = isAbsolute(opts.input)
		? opts.input
		: resolve(opts.cwd, opts.input);
	const { exitCode } = await opts.ps.spawn([
		'./packages/vex/xmllint/validate.sh',
		at,
	]);
	if (exitCode !== 0) {
		throw new Error('validation failed');
	}
}
