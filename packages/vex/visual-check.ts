import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { Logger } from 'core/log';
import type { Fs, Ps } from 'core/system';
import {
	classifyImage,
	evaluateSignificance,
	type ImageChange,
	measurePngDiff,
	renderDiffPanel,
} from './visual-diff';

/** Signal fired when a trunk landing makes a significant visual change in vexml. */
export const VISUAL_CHANGED_SIGNAL = 'vexml.visual-changed';

/** Default cap on cropped diff images generated or attached per alert. */
export const DEFAULT_MAX_IMAGES = 4;

/**
 * Checks modified committed vexml images on trunk since the last check (or across
 * an explicit `--from`..`--to` range). With `--fire`, updates
 * `.git/splates/vexml-visual-check.json` and fires `vexml.visual-changed` when
 * the change meets the significance bar. With `--render <dir>`, renders cropped
 * Before/Diff/After PNGs for up to `--max` top-ranked images.
 */
export async function visualCheck(opts: VisualCheckOptions): Promise<void> {
	if (opts.seed && opts.fire) {
		throw new Error('--seed and --fire are incompatible');
	}
	if (!Number.isInteger(opts.maxImages) || opts.maxImages < 1) {
		throw new Error('--max must be a positive integer');
	}

	const git = await resolveGitContext(opts.ps);
	if (git === null) {
		opts.log.error(
			'visual-check failed: could not locate git repository or HEAD',
		);
		opts.ps.exit(2);
		return;
	}

	const statePath = resolve(git.commonDir, 'splates/vexml-visual-check.json');

	if (opts.seed) {
		await writeState(opts.fs, statePath, {
			commit: git.head,
			lastFiredCommit: null,
			lastFiredAt: null,
		});
		opts.log.info(`seeded vexml visual check at ${short(git.head)}`);
		return;
	}

	const explicitRange = opts.from !== undefined || opts.to !== undefined;
	const prior = explicitRange ? null : await readState(opts.fs, statePath);

	if (!explicitRange && prior === null) {
		if (opts.fire && !opts.force) {
			await writeState(opts.fs, statePath, {
				commit: git.head,
				lastFiredCommit: null,
				lastFiredAt: null,
			});
			opts.log.info(`first check: recorded ${short(git.head)} without firing`);
			return;
		}
		if (!opts.fire && opts.renderDir === undefined) {
			opts.log.info(
				JSON.stringify({
					from: git.head,
					to: git.head,
					significant: false,
					reasons: [],
					totalModified: 0,
					images: [],
				}),
			);
			opts.ps.exit(1);
			return;
		}
	}

	const fromRef = opts.from ?? prior?.commit ?? `${git.head}^`;
	const toRef = opts.to ?? git.head;

	if (fromRef === toRef && !opts.force) {
		if (!opts.fire && opts.renderDir === undefined) {
			opts.log.info(
				JSON.stringify({
					from: fromRef,
					to: toRef,
					significant: false,
					reasons: [],
					totalModified: 0,
					images: [],
				}),
			);
			opts.ps.exit(1);
			return;
		}
		opts.log.info(`no new landing since ${short(toRef)}`);
		return;
	}

	const diff = await opts.ps.spawnCapture([
		'git',
		'-C',
		git.repoRoot,
		'diff',
		'--name-status',
		'--diff-filter=M',
		`${fromRef}..${toRef}`,
		'--',
		...WATCHED_PATHS,
	]);

	if (diff.exitCode !== 0) {
		if (!explicitRange && !opts.force) {
			if (opts.fire) {
				await writeState(opts.fs, statePath, {
					commit: git.head,
					lastFiredCommit: prior?.lastFiredCommit ?? null,
					lastFiredAt: prior?.lastFiredAt ?? null,
				});
				opts.log.info(
					`reset vexml visual check to ${short(git.head)} after missing commit ${short(fromRef)}`,
				);
			} else {
				opts.ps.exit(1);
			}
			return;
		}
		opts.log.error(
			`visual-check git diff failed: ${diff.stderr.trim() || `exit ${diff.exitCode}`}`,
		);
		opts.ps.exit(2);
		return;
	}

	const readBlob = opts.readGitBlob ?? defaultReadGitBlob;
	const modifiedPaths = parseModifiedPaths(diff.stdout);
	const changes: ImageChange[] = [];

	for (const repoPath of modifiedPaths) {
		const kind = classifyImage(repoPath);
		if (kind === null) {
			continue;
		}
		const name = basename(repoPath);
		if (!repoPath.endsWith('.png')) {
			changes.push({ path: repoPath, name, kind, metrics: null });
			continue;
		}
		const [beforeBuf, afterBuf] = await Promise.all([
			readBlob(git.repoRoot, fromRef, repoPath),
			readBlob(git.repoRoot, toRef, repoPath),
		]);
		const metrics =
			beforeBuf !== null && afterBuf !== null
				? measurePngDiff(beforeBuf, afterBuf)
				: null;
		changes.push({ path: repoPath, name, kind, metrics });
	}

	const evaluation = evaluateSignificance(changes);
	const [commits, task] = await Promise.all([
		readCommits(opts.ps, git.repoRoot, fromRef, toRef),
		readOriginatingTask(opts.ps),
	]);

	const payload: VisualChangedPayload = {
		from: fromRef,
		to: toRef,
		task,
		commits,
		reasons: evaluation.reasons,
		totalModified: evaluation.ranked.length,
		images: evaluation.ranked.slice(0, 12),
	};

	if (opts.renderDir !== undefined) {
		const rendered = await renderTopPanels({
			repoRoot: git.repoRoot,
			fromRef,
			toRef,
			ranked: evaluation.ranked,
			renderDir: opts.renderDir,
			maxImages: opts.maxImages,
			readBlob,
			writeBinary: opts.writeBinary ?? defaultWriteBinary,
		});
		opts.log.info(
			JSON.stringify({
				...payload,
				significant: evaluation.significant,
				rendered,
			}),
		);
		return;
	}

	if (!opts.fire) {
		opts.log.info(
			JSON.stringify({
				...payload,
				significant: evaluation.significant,
			}),
		);
		if (!evaluation.significant && !opts.force) {
			opts.ps.exit(1);
		}
		return;
	}

	const shouldFire = opts.force || evaluation.significant;
	if (shouldFire) {
		const fired = await opts.ps.spawnCapture([
			'splates',
			'signal',
			'fire',
			VISUAL_CHANGED_SIGNAL,
			'--data',
			JSON.stringify(payload),
		]);
		if (fired.exitCode !== 0) {
			const detail = fired.stderr.trim() || fired.stdout.trim();
			opts.log.error(
				`failed to fire ${VISUAL_CHANGED_SIGNAL}: ${detail || `exit ${fired.exitCode}`}`,
			);
			opts.ps.exit(2);
			return;
		}
		if (!explicitRange) {
			await writeState(opts.fs, statePath, {
				commit: toRef,
				lastFiredCommit: toRef,
				lastFiredAt: new Date().toISOString(),
			});
		}
		opts.log.info(
			`fired ${VISUAL_CHANGED_SIGNAL} (${short(fromRef)}..${short(toRef)}, ${payload.totalModified} modified images)`,
		);
		return;
	}

	if (!explicitRange) {
		await writeState(opts.fs, statePath, {
			commit: toRef,
			lastFiredCommit: prior?.lastFiredCommit ?? null,
			lastFiredAt: prior?.lastFiredAt ?? null,
		});
	}
	opts.log.info(
		payload.totalModified === 0
			? `no modified vexml images in ${short(fromRef)}..${short(toRef)}`
			: `${payload.totalModified} modified image(s) below significance bar in ${short(fromRef)}..${short(toRef)}`,
	);
}

interface RenderTopOptions {
	repoRoot: string;
	fromRef: string;
	toRef: string;
	ranked: readonly ImageChange[];
	renderDir: string;
	maxImages: number;
	readBlob: (
		repoRoot: string,
		ref: string,
		repoPath: string,
	) => Promise<Buffer | null>;
	writeBinary: (path: string, data: Buffer) => void;
}

interface RenderedEntry {
	image: string;
	name: string;
	kind: ImageChange['kind'];
	output: string;
	metrics: ImageChange['metrics'];
}

async function renderTopPanels(
	opts: RenderTopOptions,
): Promise<RenderedEntry[]> {
	const out: RenderedEntry[] = [];
	const candidates = opts.ranked.slice(0, opts.maxImages);
	for (let i = 0; i < candidates.length; i++) {
		const change = candidates[i];
		if (change === undefined) {
			continue;
		}
		const [beforeBuf, afterBuf] = await Promise.all([
			opts.readBlob(opts.repoRoot, opts.fromRef, change.path),
			opts.readBlob(opts.repoRoot, opts.toRef, change.path),
		]);
		if (afterBuf === null) {
			continue;
		}
		const prefix = String(i + 1).padStart(2, '0');
		if (!change.path.endsWith('.png') || beforeBuf === null) {
			const dest = resolve(opts.renderDir, `${prefix}-${change.name}`);
			opts.writeBinary(dest, afterBuf);
			out.push({
				image: change.path,
				name: change.name,
				kind: change.kind,
				output: dest,
				metrics: change.metrics,
			});
			continue;
		}
		const summary = formatTitle(change);
		const panel = renderDiffPanel(beforeBuf, afterBuf, summary);
		const dest = resolve(opts.renderDir, `${prefix}-${change.name}`);
		opts.writeBinary(dest, panel);
		out.push({
			image: change.path,
			name: change.name,
			kind: change.kind,
			output: dest,
			metrics: change.metrics,
		});
	}
	return out;
}

function formatTitle(change: ImageChange): string {
	const m = change.metrics;
	if (m === null) {
		return change.name;
	}
	const parts = [change.name];
	if (m.heightDelta > 0) {
		parts.push(`DH ${m.heightDelta}PX`);
	}
	parts.push(`${m.movedInkPercent}% INK (${m.movedInkPixels}PX)`);
	return parts.join(' - ');
}

function parseModifiedPaths(stdout: string): string[] {
	const paths: string[] = [];
	for (const line of stdout.split('\n')) {
		const trimmed = line.trim();
		if (trimmed === '') {
			continue;
		}
		const tab = trimmed.indexOf('\t');
		if (tab < 0) {
			continue;
		}
		const status = trimmed.slice(0, tab).trim();
		const filePath = trimmed.slice(tab + 1).trim();
		if (status === 'M' && filePath !== '') {
			paths.push(filePath);
		}
	}
	return paths;
}

async function readCommits(
	ps: Ps,
	repoRoot: string,
	fromRef: string,
	toRef: string,
): Promise<CommitRef[]> {
	const log = await ps.spawnCapture([
		'git',
		'-C',
		repoRoot,
		'log',
		'--format=%H\t%s',
		`${fromRef}..${toRef}`,
	]);
	if (log.exitCode !== 0) {
		return [];
	}
	const commits: CommitRef[] = [];
	for (const line of log.stdout.split('\n')) {
		const trimmed = line.trim();
		if (trimmed === '') {
			continue;
		}
		const tab = trimmed.indexOf('\t');
		if (tab < 0) {
			continue;
		}
		commits.push({
			sha: trimmed.slice(0, tab).slice(0, 9),
			subject: trimmed.slice(tab + 1),
		});
	}
	return commits;
}

async function readOriginatingTask(ps: Ps): Promise<OriginatingTask | null> {
	const slug = (ps.env('SPLATES_TASK') ?? '').trim();
	const rawNumbers = (ps.env('SPLATES_TASKS') ?? '').trim();
	const numbers = rawNumbers
		.split(',')
		.map((part) => Number.parseInt(part.trim(), 10))
		.filter((n) => Number.isInteger(n) && n > 0);

	if (slug === '' && numbers.length === 0) {
		return null;
	}

	let subject: string | null = null;
	let commit: string | null = null;
	const mergedNumbers = new Set(numbers);

	if (slug !== '') {
		const shown = await ps.spawnCapture(['splates', 'show', slug, '--json']);
		if (shown.exitCode === 0) {
			try {
				const parsed = JSON.parse(shown.stdout) as {
					id?: unknown;
					subject?: unknown;
					commit?: unknown;
					took?: Array<{ id?: unknown }>;
				};
				if (typeof parsed.id === 'number' && Number.isInteger(parsed.id)) {
					mergedNumbers.add(parsed.id);
				}
				if (Array.isArray(parsed.took)) {
					for (const item of parsed.took) {
						if (typeof item.id === 'number' && Number.isInteger(item.id)) {
							mergedNumbers.add(item.id);
						}
					}
				}
				if (
					typeof parsed.subject === 'string' &&
					parsed.subject.trim() !== ''
				) {
					subject = parsed.subject.trim();
				}
				if (typeof parsed.commit === 'string' && parsed.commit.trim() !== '') {
					commit = parsed.commit.trim();
				}
			} catch {
				// Ignore malformed JSON and keep env metadata.
			}
		}
	}

	return {
		slug: slug || null,
		numbers: [...mergedNumbers].sort((a, b) => a - b),
		subject,
		commit,
	};
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

async function defaultReadGitBlob(
	repoRoot: string,
	ref: string,
	repoPath: string,
): Promise<Buffer | null> {
	try {
		const { stdout } = await execFileAsync(
			'git',
			['-C', repoRoot, 'show', `${ref}:${repoPath}`],
			{ encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 },
		);
		return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
	} catch {
		return null;
	}
}

function defaultWriteBinary(path: string, data: Buffer): void {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, data);
}

async function readState(
	fs: Fs,
	path: string,
): Promise<VisualCheckState | null> {
	if (!(await fs.exists(path))) {
		return null;
	}
	try {
		const parsed = JSON.parse(await fs.read(path)) as Partial<VisualCheckState>;
		if (typeof parsed.commit !== 'string' || parsed.commit.trim() === '') {
			return null;
		}
		return {
			commit: parsed.commit,
			lastFiredCommit:
				typeof parsed.lastFiredCommit === 'string'
					? parsed.lastFiredCommit
					: null,
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
	state: VisualCheckState,
): Promise<void> {
	await fs.mkdir(dirname(path));
	await fs.write(path, `${JSON.stringify(state, null, '\t')}\n`);
}

/** Originating splates task metadata captured when `task.done` fires. */
export interface OriginatingTask {
	slug: string | null;
	numbers: number[];
	subject: string | null;
	commit: string | null;
}

/** Git commit included in the checked trunk range. */
export interface CommitRef {
	sha: string;
	subject: string;
}

/** Payload attached to `vexml.visual-changed` when it fires. */
export interface VisualChangedPayload {
	from: string;
	to: string;
	task: OriginatingTask | null;
	commits: CommitRef[];
	reasons: string[];
	totalModified: number;
	images: ImageChange[];
}

export interface VisualCheckOptions {
	fire: boolean;
	force: boolean;
	seed: boolean;
	from?: string;
	to?: string;
	renderDir?: string;
	maxImages: number;
	log: Logger;
	fs: Fs;
	ps: Ps;
	/** Swappable for tests; defaults to `git show <ref>:<path>`. */
	readGitBlob?: (
		repoRoot: string,
		ref: string,
		repoPath: string,
	) => Promise<Buffer | null>;
	/** Swappable for tests; defaults to `writeFileSync` after `mkdirSync`. */
	writeBinary?: (path: string, data: Buffer) => void;
}

interface VisualCheckState {
	commit: string;
	lastFiredCommit: string | null;
	lastFiredAt: string | null;
}

const execFileAsync = promisify(execFile);

const WATCHED_PATHS = [
	'vexml/packages/integration/__screenshots__',
	'vexml/.github/readme',
];

function short(sha: string): string {
	return sha.slice(0, 9);
}
