import { isAbsolute, resolve } from 'node:path';
import { cli, type Deps, type Next } from 'core/cmd';
import { color } from 'core/log';
import { serve } from 'core/ship';
import type { Fs } from 'core/system';
import { SystemClock } from 'core/time';
import { z } from 'zod';
import { checkVexflow } from './check-vexflow';
import { coverage } from './coverage';
import { dev } from './dev';
import { fix } from './fix';
import { DEFAULT_MAX_JEV_IMAGES } from './jev-budget';
import { lint, lintCorpus } from './lint';
import { perf } from './perf';
import { RendererBench } from './perf-bench';
import { Retrier } from './perf-retrier';
import { PerfRun } from './perf-run';
import { DEFAULT_EVERY, perfTick } from './perf-tick';
import { servePerfUi } from './perf-ui';
import { reach } from './reach';
import { readme } from './readme';
import { render } from './render';
import { FINDING_KINDS } from './render-lint';
import { DEFAULT_MIN_CONFIDENCE } from './rule-book-box';
import { RULE_TREATMENTS } from './rule-ledger';
import { parseAnswerGroups, ruleStrip } from './rule-strip';
import { rulesBookBox } from './rules-book-box-command';
import {
	rulesApprove,
	rulesSettle,
	rulesStatus,
	rulesSync,
} from './rules-command';
import { rulesTriage } from './rules-triage-command';
import { vexmlShip } from './ship';
import { slice } from './slice';
import { test } from './test';
import { validate } from './validate';
import { DEFAULT_MAX_IMAGES, visualCheck } from './visual-check';
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
	.command('settle')
	.description(
		'record agent verdicts for new or changed rules their measured checks decide (a pass approves, a failure with a `// fix: #<n>` task rejects), leaving subjective and eye-judged rules for the user',
	)
	.option('check', bool, {
		...flag,
		description: "don't write; list what would be settled",
	})
	.action((opts, { log, fs }) => rulesSettle({ check: opts.check, fs, log }));

rules
	.command('approve')
	.description(
		'record user approval at the current fingerprint for one or more rules (e.g. after Ready to merge sign-off)',
	)
	.option('note', z.string().optional(), {
		default: undefined,
		description: 'reason or sign-off note recorded on the verdict',
	})
	.option('treatment', z.enum(RULE_TREATMENTS).optional(), {
		default: undefined,
		description: 'chosen renderer treatment (defaults to any prior treatment)',
	})
	.option('task', z.coerce.number().int().positive().optional(), {
		default: undefined,
		description: 'fix task number (defaults to any prior task)',
	})
	.rest('ids', z.string(), { description: 'Behind Bars rule ID(s) to approve' })
	.action((opts, { log, fs }) =>
		rulesApprove({
			ids: opts.ids,
			note: opts.note,
			treatment: opts.treatment,
			task: opts.task,
			fs,
			log,
		}),
	);

rules
	.command('sync')
	.description(
		"update the engraving ledger's Status cells and section rule counts from the verdict ledger and check results",
	)
	.option('check', bool, {
		...flag,
		description: "don't write; fail if the engraving ledger is out of step",
	})
	.action((opts, { log, fs }) => rulesSync({ check: opts.check, fs, log }));

rules
	.command('strip')
	.description(
		"write one clean PNG comparing a rule's checks: its statement and book page, the Behind Bars example, vexml (without and with the fix under --since), MuseScore, Verovio and OSMD at one staff-space size, optionally stacked under lettered answer groups",
	)
	.arg('rule', z.string(), { description: 'the Behind Bars rule ID' })
	.option('check', z.coerce.number().int().positive().optional(), {
		default: undefined,
		description: 'show only this check (default: every check)',
	})
	.option('since', z.string().optional(), {
		default: undefined,
		description:
			'show vexml without and with the fix, "without" from this ref\'s committed render; bare --since means main (default: one vexml tile)',
	})
	.option('groups', z.string().optional(), {
		default: undefined,
		description:
			"stack tiles under lettered answer groups matching the review question's choices: '<letter>=<tile>,<tile>[: <what they draw>]' joined by ';', tiles from book, vexml, unfixed, musescore, verovio, osmd (default: ungrouped)",
	})
	.option('output', z.string().optional(), {
		default: undefined,
		description:
			'output png path (default: <tmp>/vex-rule-strip/<rule>[-check-<n>].png, outside the repo)',
	})
	.use(timing)
	.action(async (opts, { log, fs, ps, invocationDir }) => {
		await ruleStrip({
			id: opts.rule,
			check: opts.check,
			// A bare flag arrives as "true".
			since: opts.since === 'true' ? 'main' : opts.since,
			...(opts.groups === undefined
				? {}
				: { groups: parseAnswerGroups(opts.groups) }),
			output: opts.output,
			cwd: invocationDir,
			fs,
			ps,
			log,
		});
	});

rules
	.command('book-box')
	.description(
		'opt-in Behind Bars music example locator using batched Jev box queries (at most one image per page), stave validation, and --benchmark accuracy mode',
	)
	.option('page', z.string().optional(), {
		default: undefined,
		description: 'print page label to query directly, e.g. 135',
	})
	.repeated('query', z.string(), {
		description: 'example description to locate on --page (repeatable)',
	})
	.repeated('rule', z.string(), {
		description: 'rule ID whose checks to locate on its book page (repeatable)',
	})
	.option('benchmark', z.string().optional(), {
		default: undefined,
		description:
			'benchmark Jev boxes against committed Book: boxes on N distinct pages (bare --benchmark defaults to 10; strictly bounded by --max-images)',
	})
	.option('pages', z.string().optional(), {
		default: undefined,
		description:
			'comma-separated print pages to benchmark instead of stratified sampling',
	})
	.option('max-images', z.coerce.number().int().min(0), {
		default: DEFAULT_MAX_JEV_IMAGES,
		description: 'hard per-run cap on uncached page images sent to Jev',
	})
	.option('min-confidence', z.coerce.number().min(0).max(1), {
		default: DEFAULT_MIN_CONFIDENCE,
		description: 'confidence floor below which a box is flagged low-confidence',
	})
	.option('no-cache', bool, {
		...flag,
		description:
			'bypass the content-hash disk cache while keeping --max-images',
	})
	.option('output', z.string().optional(), {
		default: undefined,
		description:
			'directory for visual comparison PNGs (benchmark defaults under /tmp)',
	})
	.option('json', bool, {
		...flag,
		description: 'print structured JSON instead of formatted text',
	})
	.action(async (opts, { log, fs, ps, invocationDir }) => {
		await rulesBookBox({
			page: opts.page,
			queries: opts.query,
			rules: opts.rule,
			benchmark: opts.benchmark,
			pages: opts.pages,
			maxImages: opts['max-images'],
			minConfidence: opts['min-confidence'],
			noCache: opts['no-cache'],
			output: opts.output,
			json: opts.json,
			cwd: invocationDir,
			fs,
			ps,
			log,
		});
	});

rules
	.command('triage')
	.description(
		'opt-in advisory pre-screen of moved Behind Bars rule crops since a base ref using one cached, budget-capped Jev Before/After call per moved check',
	)
	.option('since', z.string().optional(), {
		default: undefined,
		description: 'base git ref to diff crops against (default: main)',
	})
	.repeated('rule', z.string(), {
		description: 'limit triage to specific rule ID(s) (repeatable)',
	})
	.option('max-images', z.coerce.number().int().min(0), {
		default: DEFAULT_MAX_JEV_IMAGES,
		description: 'hard per-run cap on uncached Before/After images sent to Jev',
	})
	.option('no-cache', bool, {
		...flag,
		description:
			'bypass the content-hash disk cache while keeping --max-images',
	})
	.option('json', bool, {
		...flag,
		description: 'print structured JSON instead of the advisory table',
	})
	.action(async (opts, { log, fs }) => {
		await rulesTriage({
			since: opts.since === 'true' ? 'main' : opts.since,
			rules: opts.rule,
			maxImages: opts['max-images'],
			noCache: opts['no-cache'],
			json: opts.json,
			fs,
			log,
		});
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
	.command('perf-tick')
	.description(
		'count completed vexml tasks since the last check; with --fire, fire vexml.perf-due after every N vexml landings',
	)
	.option('every', z.coerce.number().int().min(1), {
		default: DEFAULT_EVERY,
		description: 'number of vexml landings between vexml.perf-due firings',
	})
	.option('fire', bool, {
		...flag,
		description: 'update the counter and fire vexml.perf-due when due',
	})
	.option('force', bool, {
		...flag,
		description: 'with --fire, fire vexml.perf-due immediately and reset count',
	})
	.option('seed', bool, {
		...flag,
		description: 'record HEAD at count 0 without firing',
	})
	.action((opts, { log, fs, ps }) =>
		perfTick({
			every: opts.every,
			fire: opts.fire,
			force: opts.force,
			seed: opts.seed,
			log,
			fs,
			ps,
		}),
	);

vex
	.command('visual-check')
	.description(
		'check modified vexml images on trunk for significant visual changes; with --fire, fire vexml.visual-changed',
	)
	.option('fire', bool, {
		...flag,
		description:
			'update state and fire vexml.visual-changed when significant visual changes land',
	})
	.option('force', bool, {
		...flag,
		description: 'with --fire, fire even if below the significance bar',
	})
	.option('seed', bool, {
		...flag,
		description: 'record HEAD without firing',
	})
	.option('from', z.string().optional(), {
		description: 'base git ref to diff from (default: last recorded commit)',
	})
	.option('to', z.string().optional(), {
		description: 'target git ref to diff to (default: HEAD)',
	})
	.option('render', z.string().optional(), {
		description:
			'render cropped before/diff/after PNGs for the top changed images into this directory',
	})
	.option('max', z.coerce.number().int().min(1), {
		default: DEFAULT_MAX_IMAGES,
		description: 'maximum number of cropped diff panels to render',
	})
	.action((opts, { log, fs, ps, invocationDir }) => {
		let renderDir: string | undefined;
		if (opts.render !== undefined) {
			renderDir = isAbsolute(opts.render)
				? opts.render
				: resolve(invocationDir, opts.render);
		}
		return visualCheck({
			fire: opts.fire,
			force: opts.force,
			seed: opts.seed,
			from: opts.from,
			to: opts.to,
			renderDir,
			maxImages: opts.max,
			log,
			fs,
			ps,
		});
	});

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
