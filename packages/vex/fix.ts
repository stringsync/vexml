import type { Logger } from 'webappwiz/log';
import type { Ps } from 'webappwiz/system';

export interface FixOptions {
	/* Report what would change instead of writing it. */
	check: boolean;
	log: Logger;
	ps: Ps;
}

export async function fix(opts: FixOptions) {
	// Each step's own output is the report; a failure only needs a line saying
	// which one stopped the run.
	const step = async (name: string, argv: string[]) => {
		const { exitCode } = await opts.ps.spawn(argv);
		if (exitCode !== 0) {
			throw new Error(`${name} failed`);
		}
	};

	await step('biome', [
		'bunx',
		'biome',
		'check',
		...(opts.check ? [] : ['--write', '--unsafe']),
		'.',
	]);
	await step('tsc', ['bunx', 'tsc', '--noEmit']);
	opts.log.info('tsc: Compilation successful.');
	await step('xmllint', ['./packages/vex/xmllint/validate.sh']);
}
