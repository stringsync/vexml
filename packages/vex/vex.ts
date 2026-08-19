import { cli, type Deps } from 'webappwiz/cmd';
import type { Fs } from 'webappwiz/system';
import { t } from 'webappwiz/t';
import { dev } from './dev';
import { fix } from './fix';
import { release } from './release';
import { render } from './render';
import { slice } from './slice';
import { test } from './test';
import { validate } from './validate';

/** What `vex`'s commands are run with, on top of what any cli needs. */
export interface VexDeps extends Deps {
	fs: Fs;
	/**
	 * Where the user actually ran `vex`. index.ts chdir'd to the repo root
	 * before running, so the commands that take user paths resolve them
	 * against this instead of the working directory.
	 */
	invocationDir: string;
}

const flag = { default: false };

export const vex = cli<VexDeps>('vex');

vex
	.command('dev')
	.description('run the dev playground site')
	.action((_opts, { ps }) => dev({ ps }));

vex
	.command('fix')
	.description('format and lint')
	.option('check', t.boolean(), { ...flag, description: "don't write changes" })
	.action((opts, { log, ps }) => fix({ check: opts.check, log, ps }));

vex
	.command('test')
	.description(
		'run unit (src) + integration (visual regression) tests; pattern filters by name',
	)
	// Positionals bind before flags, so this is `vex test <pattern> --update`.
	.arg('pattern', t.optional(t.string()), {
		default: undefined,
		description: 'filter tests by name',
	})
	.option('update', t.boolean(), {
		...flag,
		description: 'update screenshot baselines',
	})
	.option('clean', t.boolean(), {
		...flag,
		description: 'delete orphaned screenshots',
	})
	.action(async (opts, { log, fs, ps }) => {
		if (opts.clean && opts.pattern) {
			throw new Error('--clean and a pattern are incompatible');
		}
		await test({
			update: opts.update,
			clean: opts.clean,
			pattern: opts.pattern,
			log,
			fs,
			ps,
		});
	});

vex
	.command('render')
	.description('render a musicxml file to a png')
	.option('input', t.string(), { description: 'input musicxml file' })
	.option('output', t.optional(t.string()), {
		description: 'output png path (default: ./vexml YYYY-MM-DD HH.MM.SS.png)',
	})
	.option('config', t.optional(t.string()), {
		description:
			'partial render config as JSON, e.g. \'{"noteSpacing":40,"showPartLabels":true}\'',
	})
	.option('muse', t.boolean(), {
		...flag,
		description:
			'render with a dockerized MuseScore instead — a reference, not ground truth',
	})
	.option('osmd', t.boolean(), {
		...flag,
		description:
			'render with OpenSheetMusicDisplay instead — a reference, not ground truth',
	})
	.option('alpha', t.boolean(), {
		...flag,
		description: 'render with alphaTab instead — a reference, not ground truth',
	})
	.action(async (opts, { log, fs, ps, invocationDir }) => {
		const refs = (['muse', 'osmd', 'alpha'] as const).filter(
			(name) => opts[name],
		);
		if (refs.length > 1) {
			throw new Error(`--${refs.join(' and --')} are incompatible`);
		}
		// The reference renderers are different renderers entirely; no Config.
		if (refs.length > 0 && opts.config) {
			throw new Error(`--config and --${refs[0]} are incompatible`);
		}
		await render({ ...opts, cwd: invocationDir, log, fs, ps });
	});

vex
	.command('slice')
	.description('extract measures from a musicxml file into a smaller one')
	.option('input', t.string(), { description: 'input musicxml file' })
	.option('measures', t.string(), {
		description: "measures to keep, e.g. '1,3-5,8'",
	})
	.option('output', t.optional(t.string()), {
		description: 'output musicxml path (default: ./<input>.slice.musicxml)',
	})
	.action((opts, { log, fs, invocationDir }) =>
		slice({ ...opts, cwd: invocationDir, log, fs }),
	);

vex
	.command('validate')
	.description('validate a musicxml file against the MusicXML XSD with xmllint')
	.option('input', t.string(), { description: 'input musicxml file' })
	.action((opts, { ps, invocationDir }) =>
		validate({ input: opts.input, cwd: invocationDir, ps }),
	);

vex
	.command('release')
	.description('bump version (patch|minor|major), commit, tag, and publish')
	.arg('type', t.enum(['patch', 'minor', 'major'] as const))
	.action((opts, { log, ps }) => release({ bump: opts.type, log, ps }));
