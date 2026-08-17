import { run } from './run';

export interface FixOptions {
	/* Report what would change instead of writing it. */
	check: boolean;
}

export async function fix(opts: FixOptions) {
	await run('bunx', [
		'biome',
		'check',
		...(opts.check ? [] : ['--write', '--unsafe']),
		'.',
	]);
	await run('bunx', ['tsc', '--noEmit']);
	console.log('tsc: Compilation successful.');
	await run('./xmllint/validate.sh', []);
}
