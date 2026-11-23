import path from 'node:path';
import type { Logger } from 'core/log';
import type { Fs, Ps } from 'core/system';

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
	/* Check only vet's code rules, asking no model and spending no budget. */
	codeOnly: boolean;
	fs: Fs;
	log: Logger;
	ps: Ps;
}

export async function fix(opts: FixOptions) {
	// Each step's own output is the report; a failure only needs a line saying
	// which one stopped the run.
	const step = async (name: string, argv: string[], cwd?: string) => {
		const { exitCode } = await opts.ps.spawn(argv, cwd ? { cwd } : undefined);
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

	// Vet lives at the mono root; the public mirror omits it, so skip there
	// rather than fail CI on a sibling repository that is not present.
	const monoRoot = path.resolve(opts.ps.cwd(), '..');
	if (await opts.fs.exists(path.join(monoRoot, 'vet/bin/vet'))) {
		await step(
			'vet',
			[
				'vet/bin/vet',
				'check',
				'--since',
				'main',
				'--changed-lines',
				'--disable-over-budget',
				...(opts.codeOnly ? ['--disable', 'som', '--disable', 'llm'] : []),
			],
			monoRoot,
		);
	}
}
