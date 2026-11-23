import { resolve } from 'node:path';
import type { Logger } from 'core/log';
import type { Fs, Ps } from 'core/system';
import { PNG } from 'pngjs';
import { Diffs, downscale, markdownHtml, reviewData } from './review';
import { IMAGE_PATH, type ReviewData } from './review-data';
import { reviewMessage } from './review-message';
import { ReviewStore } from './review-store';
import { carryThreads, parseReplies } from './review-thread';
import { buildStaticReview, serveReview } from './review-ui';
import { loadRuleFixReview } from './rule-fix-review';
import { collectRuleInbox } from './rule-inbox';
import {
	formatRuleInboxMessage,
	type RuleInboxData,
	type RuleInboxState,
	reviewedDecisions,
	ruleBucket,
} from './rule-inbox-data';
import { RuleInboxStore, resolveRuleInboxDir } from './rule-inbox-store';
import { serveRuleInbox } from './rule-inbox-ui';
import { readRuleNotes } from './rule-notes';

/** A splates artifact's file limit, with room to spare. */
const MAX_STATIC_BYTES = 45 * 1024 * 1024;

export interface ReviewOptions {
	name?: string;
	title?: string;
	tradeoffs?: string;
	claims?: string;
	replies?: string;
	port?: number;
	out?: string;
	maxWidth: number;
	invocationDir: string;
	fs: Fs;
	ps: Ps;
	log: Logger;
}

/**
 * Builds the next version of a review from `vex test`'s diffs, then serves it until the
 * process ends, or, with `out`, writes it as one self-contained file.
 */
export async function review(opts: ReviewOptions): Promise<void> {
	const { fs, log } = opts;
	const store = new ReviewStore(fs, opts.name ?? (await defaultName(opts.ps)));
	const read = async (file?: string) =>
		file ? fs.read(resolve(opts.invocationDir, file)) : undefined;
	const diffs = new Diffs(fs);
	const newSnapshots = await discoverNewSnapshots(opts.ps);
	const moved = await diffs.collect(await read(opts.claims), {
		newSnapshots,
		ruleNotes: await readRuleNotes(fs),
	});
	const latest = await store.latest();
	const version = latest + 1;
	const carried = await carry(
		store,
		latest,
		version,
		moved,
		await read(opts.replies),
		log,
	);
	const common = {
		id: store.id,
		version,
		title: opts.title ?? store.id,
		tradeoffs: (await read(opts.tradeoffs)) ?? null,
		unchanged: await diffs.unchanged(moved.length),
		moved,
	};

	if (opts.out) {
		const scaleOf = (entry: { width: number }) =>
			Math.min(1, opts.maxWidth / entry.width);
		const data = withThreads(
			reviewData({
				...common,
				mode: 'static',
				scale: scaleOf,
				image: (name, panel) => {
					const snapshot = moved.find((m) => m.entry.name === name);
					if (!snapshot) {
						throw new Error(`no snapshot ${name}`);
					}
					const panelPng = snapshot.panels[panel];
					if (!panelPng) {
						throw new Error(`no ${panel} panel for snapshot ${name}`);
					}
					const png = downscale(panelPng, scaleOf(snapshot.entry));
					return `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
				},
			}),
			carried,
		);
		const html = await buildStaticReview({ fs, data });
		const bytes = Buffer.byteLength(html);
		if (bytes > MAX_STATIC_BYTES) {
			throw new Error(
				`the page is ${mb(bytes)}, over the ${mb(MAX_STATIC_BYTES)} a splates artifact allows: lower --max-width (now ${opts.maxWidth}), or serve it with \`vex review\` and no --out`,
			);
		}
		// Left out of the store: a static page's review comes back pasted, not saved, so
		// `vex review show` keeps reading the served one.
		const out = resolve(opts.invocationDir, opts.out);
		await fs.write(out, html);
		log.info(
			`review ${store.id} v${version}: ${moved.length} snapshots, ${mb(bytes)} at ${out}`,
		);
		return;
	}

	const data = withThreads(
		reviewData({
			...common,
			mode: 'served',
			image: (name, panel) =>
				`${IMAGE_PATH}/${encodeURIComponent(name)}/${panel}.png`,
		}),
		carried,
	);
	await store.writeData(data);
	const url = await serveReview({ data, moved, store, port: opts.port });
	log.info(
		`review ${store.id} v${version}: ${moved.length} snapshots at ${url}`,
	);
	log.info(
		`read it with \`vex review show --name ${store.id}\`; the page stays up until ctrl-c`,
	);
	await new Promise(() => {});
}

type Carried = Pick<ReviewData, 'threads' | 'settled'>;

/** The threads the last served version leaves open, with the agent's replies to it. */
async function carry(
	store: ReviewStore,
	latest: number,
	version: number,
	moved: { entry: { name: string } }[],
	repliesText: string | undefined,
	log: Logger,
): Promise<Carried> {
	if (latest === 0) {
		if (repliesText) {
			log.error(
				`review ${store.id} has no earlier version: --replies answers nothing`,
			);
		}
		return {};
	}
	const previous = await store.readData(latest);
	const carried = carryThreads({
		previous,
		review: await store.readReview(previous),
		replies: parseReplies(repliesText ?? ''),
		version,
		moved: new Set(moved.map((m) => m.entry.name)),
		html: markdownHtml,
	});
	if (carried.unanswered.length > 0) {
		log.error(
			`--replies answers no open mark of v${latest} at ${carried.unanswered.join(', ')}: check the numbers against \`vex review show --version ${latest}\``,
		);
	}
	return { threads: carried.threads, settled: carried.settled };
}

function withThreads(data: ReviewData, carried: Carried): ReviewData {
	return {
		...data,
		threads: carried.threads ?? {},
		settled: carried.settled ?? [],
	};
}

/** Prints the review's message; with `submitted`, fails until the person submits it. */
export async function showReview(opts: ShowReviewOptions): Promise<void> {
	const store = new ReviewStore(
		opts.fs,
		opts.name ?? (await defaultName(opts.ps)),
	);
	const version = opts.version ?? (await store.latest());
	if (version === 0) {
		throw new Error(`no review ${store.id}: run \`vex review\` first`);
	}
	const data = await store.readData(version);
	const review = await store.readReview(data);
	if (opts.submitted && !review.submitted) {
		throw new Error(`review ${store.id} v${version} is not submitted yet`);
	}
	opts.log.info(reviewMessage(data, review));
}

export interface ShowReviewOptions {
	name?: string;
	version?: number;
	submitted: boolean;
	fs: Fs;
	ps: Ps;
	log: Logger;
}

export interface ReviewRulesOptions {
	fix?: string;
	port?: number;
	fs: Fs;
	ps: Ps;
	log: Logger;
}

/**
 * Serves the Behind Bars rule review inbox with out-of-worktree state persistence,
 * firing `vexml.rule-review-submitted` when the user sends a pass.
 */
export async function reviewRules(opts: ReviewRulesOptions): Promise<void> {
	const fix =
		opts.fix === undefined
			? undefined
			: await loadRuleFixReview(opts.ps, opts.fix);
	const dir = fix?.dir ?? (await resolveRuleInboxDir(opts.ps));
	const store = new RuleInboxStore(opts.fs, dir);
	const backend = {
		collect: (sitting: number) =>
			collectRuleInbox({ fs: opts.fs, sitting, fix: fix?.scope }),
		onSubmit: async (data: RuleInboxData, submittedState: RuleInboxState) => {
			if (fix) {
				return;
			}
			const entries = reviewedDecisions(data, submittedState);
			const payload = JSON.stringify({
				sitting: submittedState.sitting,
				submittedAt: submittedState.submittedAt,
				decisions: entries.length,
				entries,
			});
			// The snapshot is already saved. Log delivery errors without undoing it.
			try {
				const fired = await opts.ps.spawnCapture([
					'splates',
					'signal',
					'fire',
					'vexml.rule-review-submitted',
					'--data',
					payload,
				]);
				if (fired.exitCode !== 0) {
					throw new Error(fired.stderr.trim() || `exit ${fired.exitCode}`);
				}
			} catch (error) {
				opts.log.error(
					`rule inbox sitting ${submittedState.sitting} saved but signal failed: ${error}`,
				);
			}
		},
	};
	const state = await store.readState();
	const initial = await backend.collect(state.sitting);
	const openCount = initial.data.entries.filter(
		(entry) => ruleBucket(entry, state) === 'review',
	).length;
	const url = await serveRuleInbox({
		backend,
		store,
		port: opts.port,
	});
	opts.log.info(
		`${fix ? 'fix review' : 'rule inbox'} sitting ${state.sitting}: ${openCount} to review (${initial.data.autoPassedCount} auto-passed) at ${url}`,
	);
	opts.log.info(
		`read it with \`vex review show ${fix ? `--fix ${[...fix.scope.targets].join(',')}` : '--rules'}\`; the page stays up until ctrl-c`,
	);
	await new Promise(() => {});
}

export interface ShowRuleInboxOptions {
	fix?: string;
	submitted: boolean;
	fs: Fs;
	ps: Ps;
	log: Logger;
}

/** Prints the Behind Bars rule review inbox pass; with `submitted`, fails until sent. */
export async function showRuleInbox(opts: ShowRuleInboxOptions): Promise<void> {
	const fix =
		opts.fix === undefined
			? undefined
			: await loadRuleFixReview(opts.ps, opts.fix);
	const dir = fix?.dir ?? (await resolveRuleInboxDir(opts.ps));
	const store = new RuleInboxStore(opts.fs, dir);
	const draft = await store.readState();
	const state =
		fix && opts.submitted ? await store.readSubmission(draft.sitting) : draft;
	if (
		!state ||
		(opts.submitted &&
			(state.submittedAt === null || state.submittedSitting !== draft.sitting))
	) {
		throw new Error(`rule inbox sitting ${draft.sitting} is not submitted yet`);
	}
	const collected = await collectRuleInbox({
		fs: opts.fs,
		sitting: state.sitting,
		fix: fix?.scope,
	});
	opts.log.info(formatRuleInboxMessage(collected.data, state));
}

/** The branch's name, less a `task/` prefix: one review per task by default. */
async function defaultName(ps: Ps): Promise<string> {
	const { exitCode, stdout } = await ps.spawnCapture([
		'git',
		'rev-parse',
		'--abbrev-ref',
		'HEAD',
	]);
	const branch = stdout
		.trim()
		.replace(/^task\//, '')
		.replace(/[^\w.-]/g, '-');
	return exitCode === 0 && branch && branch !== 'HEAD' ? branch : 'review';
}

/** Baseline PNGs in `__screenshots__` that are untracked, staged-added, or added since `main`. */
async function discoverNewSnapshots(ps: Ps): Promise<string[]> {
	const dir = 'packages/integration/__screenshots__';
	const queries = [
		['git', 'ls-files', '--others', '--exclude-standard', '--', dir],
		['git', 'diff', '--name-only', '--diff-filter=A', 'HEAD', '--', dir],
		['git', 'diff', '--name-only', '--diff-filter=A', 'main...HEAD', '--', dir],
	];
	const names = new Set<string>();
	for (const cmd of queries) {
		const { exitCode, stdout } = await ps.spawnCapture(cmd);
		if (exitCode !== 0) {
			continue;
		}
		for (const line of stdout.split('\n')) {
			const trimmed = line.trim();
			if (trimmed.endsWith('.png')) {
				const base = trimmed.split('/').pop();
				if (base) {
					names.add(base);
				}
			}
		}
	}
	return [...names].sort();
}

function mb(bytes: number): string {
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
