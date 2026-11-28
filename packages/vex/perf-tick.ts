import { dirname, resolve } from 'node:path';
import type { Logger } from 'core/log';
import type { Fs, Ps } from 'core/system';

/** Signal fired after every N completed tasks that changed `vexml/`. */
export const PERF_DUE_SIGNAL = 'vexml.perf-due';

/** Default number of vexml landings between perf gardener runs. */
export const DEFAULT_EVERY = 10;

/** Payload attached to `vexml.perf-due` when it fires. */
export interface PerfDuePayload {
	from: string;
	to: string;
	count: number;
}

export interface PerfTickOptions {
	every: number;
	fire: boolean;
	force: boolean;
	seed: boolean;
	log: Logger;
	fs: Fs;
	ps: Ps;
}

interface CounterState {
	commit: string;
	count: number;
	lastFiredCommit: string;
	lastFiredAt: string | null;
}

/**
 * Counts completed tasks that touched `vexml/` since the last check.
 * In default probe mode, prints status JSON without mutating state and exits 0
 * when due, 1 when not yet due, and 2 on error. With `--fire`, updates the
 * counter in `.git/splates/vexml-perf-counter.json` and fires `vexml.perf-due`
 * once `count` reaches `every` (or immediately with `--force`), resetting the
 * counter to 0.
 */
export async function perfTick(opts: PerfTickOptions): Promise<void> {
	if (opts.seed && opts.fire) {
		throw new Error('--seed and --fire are incompatible');
	}
	if (!Number.isInteger(opts.every) || opts.every < 1) {
		throw new Error('--every must be a positive integer');
	}

	const git = await resolveGitContext(opts.ps);
	if (git === null) {
		opts.log.error('perf-tick failed: could not locate git repository or HEAD');
		opts.ps.exit(2);
		return;
	}

	const statePath = resolve(git.commonDir, 'splates/vexml-perf-counter.json');

	if (opts.seed) {
		await writeState(opts.fs, statePath, {
			commit: git.head,
			count: 0,
			lastFiredCommit: git.head,
			lastFiredAt: null,
		});
		opts.log.info(
			`seeded vexml perf counter at ${short(git.head)} (0/${opts.every})`,
		);
		return;
	}

	const prior = await readState(opts.fs, statePath);
	if (prior === null) {
		if (opts.fire && opts.force) {
			await fireAndReset(
				statePath,
				{
					from: git.head,
					to: git.head,
					count: 0,
				},
				opts,
			);
			return;
		}
		if (opts.fire) {
			await writeState(opts.fs, statePath, {
				commit: git.head,
				count: 0,
				lastFiredCommit: git.head,
				lastFiredAt: null,
			});
			opts.log.info(
				`first check: recorded ${short(git.head)}, count 0/${opts.every}`,
			);
			return;
		}
		opts.log.info(
			JSON.stringify({
				from: git.head,
				to: git.head,
				count: 0,
				every: opts.every,
				due: false,
			}),
		);
		opts.ps.exit(1);
		return;
	}

	let nextCount = prior.count;
	let lastFiredCommit = prior.lastFiredCommit;
	let touchedVexml = false;

	if (prior.commit !== git.head) {
		const diff = await opts.ps.spawnCapture([
			'git',
			'-C',
			git.repoRoot,
			'diff',
			'--name-only',
			`${prior.commit}..${git.head}`,
			'--',
			'vexml/',
		]);
		if (diff.exitCode !== 0) {
			// Recorded commit is gone (e.g. history rewrite): re-seed cleanly unless forced.
			if (!opts.force) {
				if (opts.fire) {
					await writeState(opts.fs, statePath, {
						commit: git.head,
						count: 0,
						lastFiredCommit: git.head,
						lastFiredAt: prior.lastFiredAt,
					});
					opts.log.info(
						`reset vexml perf counter to ${short(git.head)} after missing commit ${short(prior.commit)}`,
					);
				} else {
					opts.log.info(
						JSON.stringify({
							from: git.head,
							to: git.head,
							count: 0,
							every: opts.every,
							due: false,
						}),
					);
					opts.ps.exit(1);
				}
				return;
			}
			lastFiredCommit = git.head;
		} else {
			touchedVexml = diff.stdout.trim() !== '';
			if (touchedVexml) {
				nextCount += 1;
			}
		}
	}

	const due = opts.force || nextCount >= opts.every;

	if (!opts.fire) {
		opts.log.info(
			JSON.stringify({
				from: lastFiredCommit,
				to: git.head,
				count: nextCount,
				every: opts.every,
				due,
			}),
		);
		if (!due) {
			opts.ps.exit(1);
		}
		return;
	}

	if (due) {
		await fireAndReset(
			statePath,
			{
				from: lastFiredCommit,
				to: git.head,
				count: nextCount,
			},
			opts,
		);
		return;
	}

	if (prior.commit === git.head) {
		opts.log.info(
			`no new landing since ${short(git.head)} (${nextCount}/${opts.every})`,
		);
		return;
	}

	await writeState(opts.fs, statePath, {
		commit: git.head,
		count: nextCount,
		lastFiredCommit,
		lastFiredAt: prior.lastFiredAt,
	});
	opts.log.info(
		touchedVexml
			? `vexml perf counter ${nextCount}/${opts.every} (${short(git.head)})`
			: `no vexml changes in ${short(prior.commit)}..${short(git.head)} (${nextCount}/${opts.every})`,
	);
}

async function fireAndReset(
	statePath: string,
	payload: PerfDuePayload,
	opts: PerfTickOptions,
): Promise<void> {
	const fired = await opts.ps.spawnCapture([
		'splates',
		'signal',
		'fire',
		PERF_DUE_SIGNAL,
		'--data',
		JSON.stringify(payload),
	]);
	if (fired.exitCode !== 0) {
		const detail = fired.stderr.trim() || fired.stdout.trim();
		opts.log.error(
			`failed to fire ${PERF_DUE_SIGNAL}: ${detail || `exit ${fired.exitCode}`}`,
		);
		opts.ps.exit(2);
		return;
	}

	await writeState(opts.fs, statePath, {
		commit: payload.to,
		count: 0,
		lastFiredCommit: payload.to,
		lastFiredAt: new Date().toISOString(),
	});
	opts.log.info(
		`fired ${PERF_DUE_SIGNAL} (${short(payload.from)}..${short(payload.to)}, ${payload.count} tasks)`,
	);
}

interface GitContext {
	repoRoot: string;
	commonDir: string;
	head: string;
}

async function resolveGitContext(ps: Ps): Promise<GitContext | null> {
	const [top, common, head] = await Promise.all([
		ps.spawnCapture(['git', 'rev-parse', '--show-toplevel']),
		ps.spawnCapture(['git', 'rev-parse', '--git-common-dir']),
		ps.spawnCapture(['git', 'rev-parse', 'HEAD']),
	]);
	if (
		top.exitCode !== 0 ||
		common.exitCode !== 0 ||
		head.exitCode !== 0 ||
		top.stdout.trim() === '' ||
		common.stdout.trim() === '' ||
		head.stdout.trim() === ''
	) {
		return null;
	}
	return {
		repoRoot: resolve(ps.cwd(), top.stdout.trim()),
		commonDir: resolve(ps.cwd(), common.stdout.trim()),
		head: head.stdout.trim(),
	};
}

async function readState(fs: Fs, path: string): Promise<CounterState | null> {
	if (!(await fs.exists(path))) {
		return null;
	}
	try {
		const parsed = JSON.parse(await fs.read(path)) as Partial<CounterState>;
		if (
			typeof parsed.commit !== 'string' ||
			typeof parsed.count !== 'number' ||
			!Number.isInteger(parsed.count) ||
			parsed.count < 0
		) {
			return null;
		}
		return {
			commit: parsed.commit,
			count: parsed.count,
			lastFiredCommit:
				typeof parsed.lastFiredCommit === 'string'
					? parsed.lastFiredCommit
					: parsed.commit,
			lastFiredAt:
				typeof parsed.lastFiredAt === 'string' ? parsed.lastFiredAt : null,
		};
	} catch {
		return null;
	}
}

async function writeState(
	fs: Fs,
	path: string,
	state: CounterState,
): Promise<void> {
	await fs.mkdir(dirname(path));
	await fs.write(path, `${JSON.stringify(state, null, '\t')}\n`);
}

function short(sha: string): string {
	return sha.slice(0, 9);
}
