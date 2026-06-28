import { isAbsolute, resolve } from 'node:path';
import { run } from './run';

export async function validate(opts: { input: string; cwd: string }) {
	// index.ts chdir'd to the repo root, so resolve the user path against their cwd.
	const at = isAbsolute(opts.input)
		? opts.input
		: resolve(opts.cwd, opts.input);
	await run('./xmllint/validate.sh', [at]);
}
