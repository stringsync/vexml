import type { Logger } from 'core/log';
import type { Ps } from 'core/system';

const PACKAGES = [
	'benchmarks',
	'integration',
	'renderer',
	'site',
	'vex',
	'vexml',
];

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
	// One program per package, each with its own lib and types.
	for (const pkg of PACKAGES) {
		await step(`tsc ${pkg}`, [
			'bunx',
			'tsc',
			'--noEmit',
			'-p',
			`packages/${pkg}/tsconfig.json`,
		]);
	}
	opts.log.info('tsc: Compilation successful.');
	await step('xmllint', ['./packages/vex/xmllint/validate.sh']);
}
