import { resolve } from 'node:path';
import { cli, type Deps, type Next } from 'core/cmd';
import { color } from 'core/log';
import { serve as serveRigs } from 'core/rig';
import { serve } from 'core/ship';
import type { Fs } from 'core/system';
import { SystemClock } from 'core/time';
import { z } from 'zod';
import { checkVexflow } from './check-vexflow';
import { coverage } from './coverage';
import { dev } from './dev';
import { fix } from './fix';
import { lint, lintCorpus } from './lint';
import { perf } from './perf';
import { RendererBench } from './perf-bench';
import { Retrier } from './perf-retrier';
import { PerfRun } from './perf-run';
import { servePerfUi } from './perf-ui';
import { reach } from './reach';
import { readme } from './readme';
import { render } from './render';
import { FINDING_KINDS } from './render-lint';
import {
	review,
	reviewRules,
	showReview,
	showRuleInbox,
} from './review-command';
import { vexmlRigs } from './rig';
import { rulesStatus, rulesSync } from './rules-command';
import { vexmlShip } from './ship';
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
	.description('format, lint, typecheck, and vet')
	.option('check', bool, { ...flag, description: "don't write changes" })
	.option('code-only', bool, {
		...flag,
		description:
			"check only vet's code rules, asking no model and spending no budget",
	})
	.action((opts, { fs, log, ps }) =>
		fix({ check: opts.check, codeOnly: opts['code-only'], fs, log, ps }),
	);

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
	.command('reach')
	.description(
		'render complete musicxml scores and check every slur, tie and hairpin starts at its start note and reaches its stop note, or the system end and resumes after a break; fails when one falls short',
	)
	.option('input', z.string(), {
		description:
			'complete musicxml files, comma separated (not a vex slice, which restores spans at its cuts)',
	})
	.use(timing)
	.action((opts, { log, fs, invocationDir }) =>
		reach({
			inputs: opts.input.split(',').map((p) => p.trim()),
			cwd: invocationDir,
			log,
			fs,
		}),
	);

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

const reviews = vex
	.group('review')
	.description(
		'review the snapshots `vex test` found moved, on a page the person marks up and submits',
	)
	.fallback('serve');

reviews
	.command('serve')
	.description(
		'serve the next version of the review page until ctrl-c; the page saves the review for `vex review show`',
	)
	.option('name', z.string().optional(), {
		default: undefined,
		description: "the review's name (default: the branch, less task/)",
	})
	.option('title', z.string().optional(), {
		default: undefined,
		description: 'the heading (default: the name)',
	})
	.option('tradeoffs', z.string().optional(), {
		default: undefined,
		description: 'a markdown file of trade-offs, shown above the snapshots',
	})
	.option('claims', z.string().optional(), {
		default: undefined,
		description:
			"a markdown file with a `## <snapshot>` section per snapshot: plain prose or four `###` headings (The rule, The test case, What to look for, What was found), the first three defaulting to a rule's note in packages/integration/rules; naming an unchanged baseline includes it",
	})
	.option('replies', z.string().optional(), {
		default: undefined,
		description:
			"a markdown file answering the last version's marks: a `## <snapshot>` section per snapshot, a numbered list by each mark's number in `vex review show`",
	})
	.option('port', z.coerce.number().int().optional(), {
		default: undefined,
		description: 'the port to serve on (default: the first free from 5173)',
	})
	.option('out', z.string().optional(), {
		default: undefined,
		description:
			'write one self-contained HTML file instead of serving, for `splates artifact add`; it copies its review out',
	})
	.option('rules', bool, {
		...flag,
		description:
			'serve the Behind Bars rule review inbox across sittings, persisting progress outside any worktree',
	})
	.option('fix', z.string().optional(), {
		default: undefined,
		description:
			'serve a fix review for these comma-separated rule IDs plus every rule changed since main',
	})
	.option('max-width', z.coerce.number().int().positive(), {
		default: 1200,
		description: 'with --out: scale each image down to this width at most',
	})
	.action((opts, { log, fs, ps, invocationDir }) =>
		opts.rules || opts.fix !== undefined
			? reviewRules({ port: opts.port, fix: opts.fix, fs, ps, log })
			: review({
					name: opts.name,
					title: opts.title,
					tradeoffs: opts.tradeoffs,
					claims: opts.claims,
					replies: opts.replies,
					port: opts.port,
					out: opts.out,
					maxWidth: opts['max-width'],
					invocationDir,
					fs,
					ps,
					log,
				}),
	);

reviews
	.command('show')
	.description(
		"print the review as the person left it: a `[VEX REVIEW ...]` message with each mark's measures, staves and notes, and the same as JSON",
	)
	.option('rules', bool, {
		...flag,
		description: 'print the Behind Bars rule review inbox pass instead',
	})
	.option('fix', z.string().optional(), {
		default: undefined,
		description:
			'read the fix review for these comma-separated rule IDs plus every rule changed since main',
	})
	.option('name', z.string().optional(), {
		default: undefined,
		description: "the review's name (default: the branch, less task/)",
	})
	.option('version', z.coerce.number().int().positive().optional(), {
		default: undefined,
		description: 'the version (default: the newest)',
	})
	.option('submitted', bool, {
		...flag,
		description:
			'fail until the person submits it, for a `splates signal poll` probe',
	})
	.action((opts, { log, fs, ps }) =>
		opts.rules || opts.fix !== undefined
			? showRuleInbox({ submitted: opts.submitted, fix: opts.fix, fs, ps, log })
			: showReview({
					name: opts.name,
					version: opts.version,
					submitted: opts.submitted,
					fs,
					ps,
					log,
				}),
	);

const rules = vex
	.group('rules')
	.description('inspect Behind Bars rule fingerprints and review verdicts');

rules
	.command('status')
	.description(
		'list every Behind Bars rule as new, changed (naming which part moved), rejected, needs-decision, or approved',
	)
	.option('json', bool, {
		...flag,
		description: 'print each rule and its fingerprint as JSON',
	})
	.action((opts, { log, fs }) => rulesStatus({ json: opts.json, fs, log }));

rules
	.command('sync')
	.description(
		'update the Status column of ENGRAVING.md from the verdict ledger and check results',
	)
	.option('check', bool, {
		...flag,
		description: "don't write; fail if ENGRAVING.md is out of step",
	})
	.action((opts, { log, fs }) => rulesSync({ check: opts.check, fs, log }));

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
	.command('check-vexflow')
	.description(
		'check npm for a newer vexflow release than vexml pins; with --fire, fire vexml.vexflow-updated once per version',
	)
	.option('fire', bool, {
		...flag,
		description: 'fire vexml.vexflow-updated when an unseen update is found',
	})
	.option('force', bool, {
		...flag,
		description: 'with --fire, fire even if this version was already signaled',
	})
	.option('seed', bool, {
		...flag,
		description: 'record the current npm latest version without firing',
	})
	.action((opts, { log, fs, ps }) =>
		checkVexflow({
			fire: opts.fire,
			force: opts.force,
			seed: opts.seed,
			log,
			fs,
			ps,
		}),
	);

vex
	.command('rig')
	.description(
		"the playground's dev server for splates's Rigs page: answers describe and start <rig>",
	)
	.rest('args', z.string(), {
		description: '[describe | start <rig> [--<option>=<value>]]',
	})
	.allowUnknownOption()
	.action((opts, { ps }) => serveRigs(vexmlRigs(ps), opts.args));

vex
	.command('ship')
	.description(
		"ship @stringsync/vexml to npm: answers splates's plan, done and run, or ships it all at a terminal",
	)
	.rest('args', z.string(), {
		description:
			'[plan | done <step> | run <step>] [--bump patch|minor|major] [--upstream @stringsync/mdom=<version>]',
	})
	.allowUnknownOption()
	.action((opts, { ps }) => {
		// The release's commands run from mono's root, one above vexml's.
		ps.cd(`${ps.cwd()}/..`);
		return serve(vexmlShip, opts.args, { ps });
	});

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
