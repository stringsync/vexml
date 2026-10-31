import { resolve } from 'node:path';
import { cli, type Deps, type Next } from 'core/cmd';
import { color } from 'core/log';
import type { Fs } from 'core/system';
import { SystemClock } from 'core/time';
import { z } from 'zod';
import { coverage } from './coverage';
import { dev } from './dev';
import { fix } from './fix';
import { lint, lintCorpus } from './lint';
import { perf } from './perf';
import { RendererBench } from './perf-bench';
import { Retrier } from './perf-retrier';
import { PerfRun } from './perf-run';
import { servePerfUi } from './perf-ui';
import { readme } from './readme';
import { render } from './render';
import { FINDING_KINDS } from './render-lint';
import { publish, ship, trust } from './ship';
import { slice } from './slice';
import { test } from './test';
import { validate } from './validate';
import { WarmBench } from './warm-bench';

/** What `vex`'s commands are run with, on top of what any cli needs. */
export interface VexDeps extends Deps {
	fs: Fs;
	/**
	 * Directory where the user invoked `vex`, used to resolve relative input
	 * and output paths.
	 */
	invocationDir: string;
}

// A bare flag arrives as "true"; only an explicit `--x false` turns it off.
const bool = z.string().transform((raw) => raw !== 'false');

const flag = { default: false };

const clock = new SystemClock();

export const vex = cli<VexDeps>('vex');

vex
	.command('dev')
	.description('run the dev playground site')
	.action((_opts, { ps }) => dev({ ps }));

vex
	.command('fix')
	.description('format and lint')
	.option('check', bool, { ...flag, description: "don't write changes" })
	.action((opts, { log, ps }) => fix({ check: opts.check, log, ps }));

vex
	.command('test')
	.description(
		'run unit (vexml) + integration (visual regression) tests; pattern filters by name',
	)
	// Positionals bind before flags, so this is `vex test <pattern> --update`.
	.arg('pattern', z.string().optional(), {
		default: undefined,
		description: 'filter tests by name',
	})
	.option('update', bool, {
		...flag,
		description: 'update screenshot baselines',
	})
	.option('clean', bool, {
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
	.option('input', z.string(), { description: 'input musicxml file' })
	.option('output', z.string().optional(), {
		description: 'output png path (default: ./vexml YYYY-MM-DD HH.MM.SS.png)',
	})
	.option('config', z.string().optional(), {
		description:
			'partial render config as JSON, e.g. \'{"noteSpacing":40,"showPartLabels":true}\'',
	})
	.option('muse', bool, {
		...flag,
		description:
			'render with a dockerized MuseScore instead: a reference, not ground truth',
	})
	.option('osmd', bool, {
		...flag,
		description:
			'render with OpenSheetMusicDisplay instead: a reference, not ground truth',
	})
	.option('alpha', bool, {
		...flag,
		description: 'render with alphaTab instead: a reference, not ground truth',
	})
	.use(timing)
	.action(async (opts, { log, fs, invocationDir }) => {
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
		await render({ ...opts, cwd: invocationDir, log, fs });
	});

vex
	.command('lint')
	.description(
		'render a musicxml file and judge the pixels: a 0..100 score per renderer, the findings that cost it points, and the png with each finding boxed',
	)
	.option('input', z.string().optional(), {
		description: 'input musicxml file',
	})
	.option('semantic', z.boolean(), {
		default: false,
		description:
			'also check each measure with Jev: renderer voting and XML presence; skips without TYPESAFE_API_KEY',
	})
	.option('corpus', bool, {
		...flag,
		description:
			'score the lint against its corpus (packages/integration/__lint__) instead: precision, recall and hit rate per finding kind; fails when a defect it found goes unfound or a clean render gains a finding',
	})
	.option('add', z.string().optional(), {
		description:
			'with --corpus, add the defect a commit fixed, as <commit>:<screenshot>, e.g. 6a66854a:rest.png',
	})
	.option('kind', z.string().default('collision'), {
		description: `with --add, what the defect is: collision, ${FINDING_KINDS.join(', ')}`,
	})
	.option('renderer', z.string(), {
		default: 'vexml',
		description:
			"renderers to lint, comma separated: vexml, osmd, alphatab, musescore, or 'all'",
	})
	.option('output', z.string().optional(), {
		description:
			'directory for the marked pngs and the json report (default: .)',
	})
	.use(timing)
	.action((opts, { log, fs, invocationDir }) => {
		if (opts.corpus) {
			return lintCorpus({
				add: opts.add,
				kind: opts.kind,
				semantic: opts.semantic,
				output: opts.output,
				cwd: invocationDir,
				fs,
				log,
			});
		}
		if (!opts.input) {
			throw new Error('--input or --corpus is required');
		}
		return lint({ ...opts, input: opts.input, cwd: invocationDir, log, fs });
	});

vex
	.command('perf')
	.option('corpus', z.string().optional(), {
		default: undefined,
		description:
			'opt-in directory of MusicXML inputs, relative to the invocation directory',
	})
	.description(
		'render every musicxml fixture through vexml, osmd, and alphatab once (after an untimed warm-up render per engine), and tabulate time and output size; pattern filters by filename',
	)
	.arg('pattern', z.string().optional(), {
		default: undefined,
		description: 'filter fixtures by filename',
	})
	.option('ui', bool, {
		...flag,
		description: 'also watch the run, and compare the outputs, in a browser',
	})
	.use(timing)
	.action(async (opts, { log, fs, invocationDir }) => {
		const dataDir = opts.corpus
			? resolve(invocationDir, opts.corpus)
			: undefined;
		const renderer = new RendererBench(fs, dataDir);
		const bench = new WarmBench(renderer);
		if (!opts.ui) {
			try {
				await perf({ pattern: opts.pattern, dataDir, bench, log, fs });
			} finally {
				await renderer.disposeAsync();
			}
			return;
		}
		// No dispose: the bench's browser stays warm for retries until Ctrl-C ends the
		// process, and the browser with it.
		const run = new PerfRun(clock);
		const retries = new Retrier({ run, bench, log });
		log.info(`perf ui at ${await servePerfUi({ run, retries })}`);
		await perf({
			pattern: opts.pattern,
			dataDir,
			bench,
			log,
			fs,
			listener: run,
		});
		retries.open();
		log.info('run done; the page stays up, for retries, until ctrl-c');
		await new Promise(() => {});
	});

vex
	.command('slice')
	.description('extract measures from a musicxml file into a smaller one')
	.option('coordinate', z.enum(['label', 'position'] as const), {
		default: 'label' as const,
		description:
			'label: match printed measure numbers (all occurrences). position: 1-based source measure ordinals, shared across parts; count every measure including pickups, without restarting at movements or expanding repeats. Requires equal measure counts in all parts; preserves labels and document order',
	})
	.option('policy', z.enum(['standalone', 'raw'] as const), {
		default: 'standalone' as const,
		description:
			'standalone: play retained measures once in source order; remove all repeats, endings and D.C./D.S./Fine/To Coda navigation, even within the slice; restore direction spans and measure styles at cuts, preserving note-anchored endpoints. raw: preserve markings across cuts',
	})
	.option('input', z.string(), { description: 'input musicxml file' })
	.option('measures', z.string(), {
		description: "measures to keep, e.g. '1,3-5,8'",
	})
	.option('output', z.string().optional(), {
		description: 'output musicxml path (default: ./<input>.slice.musicxml)',
	})
	.action((opts, { log, fs, invocationDir }) =>
		slice({ ...opts, cwd: invocationDir, log, fs }),
	);

vex
	.command('readme')
	.description(
		"record the root README's example images and gifs from fixture slices",
	)
	.option('output', z.string().optional(), {
		description: 'output directory (default: .github/readme)',
	})
	.use(timing)
	.action((opts, { log, fs, invocationDir }) =>
		readme({ ...opts, cwd: invocationDir, log, fs }),
	);

vex
	.command('validate')
	.description('validate a musicxml file against the MusicXML XSD with xmllint')
	.option('input', z.string(), { description: 'input musicxml file' })
	.action((opts, { ps, invocationDir }) =>
		validate({ input: opts.input, cwd: invocationDir, ps }),
	);

vex
	.command('coverage')
	.description(
		'sync the MusicXML coverage table with the schema and check its fixtures',
	)
	.action((_opts, { log, fs }) => coverage({ log, fs }));

vex
	.command('ship')
	.description('bump version (patch|minor|major), commit, tag, and publish')
	.arg('type', z.enum(['patch', 'minor', 'major'] as const))
	.option('dry-run', z.boolean(), {
		default: false,
		description: 'rehearse the release, publishing and pushing nothing',
	})
	.action((opts, { log, ps }) =>
		ship({ bump: opts.type, log, ps, dryRun: opts['dry-run'] }),
	);

vex
	.command('publish')
	.description(
		"build @stringsync/vexml and publish it at this checkout's version: what stringsync/vexml's publish workflow runs, from a job npm trusts",
	)
	.action((_opts, { log, ps }) => publish({ log, ps }));

vex
	.command('trust')
	.description(
		"have npm trust stringsync/vexml's publish workflow to publish @stringsync/vexml; once, signing in in a browser",
	)
	.action((_opts, { log, ps }) => trust({ log, ps }));

/** Reports how long the command took once it is done. */
async function timing(ctx: VexDeps, next: Next<VexDeps>): Promise<void> {
	const started = clock.now();
	await next(ctx);
	// args[0] is the command; a failing command throws past this, so only the
	// runs that finished get timed.
	ctx.log.info(
		`${color.dim(ctx.ps.args[0])} took ${clock.now().subtract(started).human()}`,
	);
}
