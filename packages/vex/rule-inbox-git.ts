import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PNG } from 'pngjs';

const execFileAsync = promisify(execFile);

/** Git commit metadata returned by `RuleInboxGit.log`. */
export interface GitCommitRef {
	hash: string;
	subject: string;
}

/** Minimal git history access for locating approved baseline renders and change reasons. */
export interface RuleInboxGit {
	/** Commits touching `repoPaths`, newest first, limited to `limit`. */
	log(repoPaths: string[], limit?: number): Promise<GitCommitRef[]>;
	/** Raw file bytes at `commit:repoPath`, or null if missing at that revision. */
	showBytes(commit: string, repoPath: string): Promise<Uint8Array | null>;
	/** Latest commit subject in `sinceCommit..HEAD` touching `repoPaths`, or null. */
	latestChangeSince(
		sinceCommit: string,
		repoPaths: string[],
	): Promise<GitCommitRef | null>;
}

/** Result of comparing two renders pixel by pixel and producing a red/blue diff PNG. */
export interface PixelDiffResult {
	changed: number;
	share: number;
	diffPng: Buffer;
}

/**
 * Computes a red/blue engraving diff between `before` and `after`:
 * unchanged pixels render as a faint ghost over white, pixels added or darkened in
 * `after` render vivid red, and pixels removed from `before` render vivid blue.
 */
export function computePixelDiff(before: PNG, after: PNG): PixelDiffResult {
	const width = Math.max(before.width, after.width);
	const height = Math.max(before.height, after.height);
	const out = new PNG({ width, height });
	let changed = 0;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const outAt = (y * width + x) * 4;
			const hasBefore = x < before.width && y < before.height;
			const hasAfter = x < after.width && y < after.height;
			const bAt = hasBefore ? (y * before.width + x) * 4 : -1;
			const aAt = hasAfter ? (y * after.width + x) * 4 : -1;

			const br = bAt >= 0 ? (before.data[bAt] ?? 255) : 255;
			const bg = bAt >= 0 ? (before.data[bAt + 1] ?? 255) : 255;
			const bb = bAt >= 0 ? (before.data[bAt + 2] ?? 255) : 255;
			const ba = bAt >= 0 ? (before.data[bAt + 3] ?? 255) : 0;

			const ar = aAt >= 0 ? (after.data[aAt] ?? 255) : 255;
			const ag = aAt >= 0 ? (after.data[aAt + 1] ?? 255) : 255;
			const ab = aAt >= 0 ? (after.data[aAt + 2] ?? 255) : 255;
			const aa = aAt >= 0 ? (after.data[aAt + 3] ?? 255) : 0;

			const diff =
				Math.abs(br - ar) +
				Math.abs(bg - ag) +
				Math.abs(bb - ab) +
				Math.abs(ba - aa);

			if (diff > 24) {
				changed++;
				// Darker ink in After -> vivid red; ink that was only in Before -> vivid blue.
				const beforeLum = luminance(br, bg, bb, ba);
				const afterLum = luminance(ar, ag, ab, aa);
				if (afterLum <= beforeLum) {
					out.data[outAt] = 220;
					out.data[outAt + 1] = 38;
					out.data[outAt + 2] = 38;
					out.data[outAt + 3] = 235;
				} else {
					out.data[outAt] = 37;
					out.data[outAt + 1] = 99;
					out.data[outAt + 2] = 235;
					out.data[outAt + 3] = 215;
				}
			} else {
				// Softened ghost of unchanged score ink over pure white.
				out.data[outAt] = Math.round(255 - (255 - ar) * 0.38);
				out.data[outAt + 1] = Math.round(255 - (255 - ag) * 0.38);
				out.data[outAt + 2] = Math.round(255 - (255 - ab) * 0.38);
				out.data[outAt + 3] = 255;
			}
		}
	}

	const total = Math.max(1, width * height);
	return {
		changed,
		share: changed / total,
		diffPng: PNG.sync.write(out),
	};
}

/** Git implementation backed by `git` subprocesses in the repository root. */
export class SystemRuleInboxGit implements RuleInboxGit {
	private repoRootPromise: Promise<string | null> | null = null;

	constructor(private readonly cwd = process.cwd()) {}

	async log(repoPaths: string[], limit = 20): Promise<GitCommitRef[]> {
		const root = await this.repoRoot();
		if (!root) {
			return [];
		}
		const out = await this.runUtf8(root, [
			'log',
			`-n${limit}`,
			'--format=%H%x00%s',
			'--',
			...repoPaths,
		]);
		if (!out) {
			return [];
		}
		return out
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => {
				const [hash = '', subject = ''] = line.split('\0');
				return { hash, subject };
			})
			.filter((entry) => entry.hash.length > 0);
	}

	async showBytes(
		commit: string,
		repoPath: string,
	): Promise<Uint8Array | null> {
		const root = await this.repoRoot();
		if (!root) {
			return null;
		}
		try {
			const { stdout } = await execFileAsync(
				'git',
				['show', `${commit}:${repoPath}`],
				{
					cwd: root,
					encoding: 'buffer',
					maxBuffer: 20 * 1024 * 1024,
				},
			);
			return new Uint8Array(stdout);
		} catch {
			return null;
		}
	}

	async latestChangeSince(
		sinceCommit: string,
		repoPaths: string[],
	): Promise<GitCommitRef | null> {
		const root = await this.repoRoot();
		if (!root) {
			return null;
		}
		const out = await this.runUtf8(root, [
			'log',
			`${sinceCommit}..HEAD`,
			'-n1',
			'--format=%H%x00%s',
			'--',
			...repoPaths,
		]);
		const first = out?.split('\n')[0]?.trim();
		if (!first) {
			return null;
		}
		const [hash = '', subject = ''] = first.split('\0');
		return hash ? { hash, subject } : null;
	}

	private repoRoot(): Promise<string | null> {
		if (!this.repoRootPromise) {
			this.repoRootPromise = this.runUtf8(this.cwd, [
				'rev-parse',
				'--show-toplevel',
			]).then((out) => out?.trim() || null);
		}
		return this.repoRootPromise;
	}

	private async runUtf8(cwd: string, args: string[]): Promise<string | null> {
		try {
			const { stdout } = await execFileAsync('git', args, {
				cwd,
				encoding: 'utf8',
				maxBuffer: 4 * 1024 * 1024,
			});
			return stdout;
		} catch {
			return null;
		}
	}
}

function luminance(r: number, g: number, b: number, a: number): number {
	const alpha = a / 255;
	const effR = 255 * (1 - alpha) + r * alpha;
	const effG = 255 * (1 - alpha) + g * alpha;
	const effB = 255 * (1 - alpha) + b * alpha;
	return 0.299 * effR + 0.587 * effG + 0.114 * effB;
}
