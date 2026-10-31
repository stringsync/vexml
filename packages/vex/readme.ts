import { isAbsolute, resolve } from 'node:path';
import { ReadmeMedia, type ReadmeSources } from '@vexml/renderer';
import type { Logger } from 'core/log';
import type { Fs } from 'core/system';
import { MeasureSlicer } from './measure-slicer';

export interface ReadmeOptions {
	/* Defaults to `.github/readme` in the repo. */
	output?: string;
	/* Where the user ran `vex`; index.ts chdir'd to the repo root, so relative
	 * paths resolve against this. */
	cwd: string;
	log: Logger;
	fs: Fs;
}

const FIXTURES = 'packages/integration/__data__';

// Which fixture measures each README example engraves: kept to a measure or two, so every
// image reads at a glance.
const SLICES: Record<keyof ReadmeSources, [fixture: string, measures: string]> =
	{
		tab: ['score_amazing_grace', '1-2'],
		song: ['score_beethoven_an_die_ferne_geliebte', '1-2'],
		songOpening: ['score_beethoven_an_die_ferne_geliebte', '1'],
		songLong: ['score_beethoven_an_die_ferne_geliebte', '1-7'],
	};

export async function readme(opts: ReadmeOptions) {
	// index.ts chdir'd to the repo root, so the default lands in the repo and a user path
	// resolves against their cwd.
	const at = (p: string) => (isAbsolute(p) ? p : resolve(opts.cwd, p));
	const output = opts.output ? at(opts.output) : resolve('.github/readme');

	const sources = {} as ReadmeSources;
	for (const [name, [fixture, measures]] of Object.entries(SLICES)) {
		const xml = await opts.fs.read(`${FIXTURES}/${fixture}.musicxml`);
		sources[name as keyof ReadmeSources] = new MeasureSlicer(measures).slice(
			xml,
		);
	}

	for (const path of await new ReadmeMedia(output, sources).record()) {
		opts.log.info(`wrote ${path}`);
	}
}
