import { isAbsolute, resolve } from 'node:path';
import { run } from './run';

export interface ValidateOptions {
	input: string;
	/* Where the user ran `vex`; index.ts chdir'd to the repo root, so relative
	 * input paths resolve against this. */
	cwd: string;
}

export async function validate(opts: ValidateOptions) {
	// index.ts chdir'd to the repo root, so resolve the user path against their cwd.
	const at = isAbsolute(opts.input)
		? opts.input
		: resolve(opts.cwd, opts.input);
	await run('./xmllint/validate.sh', [at]);
}
