import { dirname, resolve } from 'node:path';
import type { Logger } from 'core/log';
import type { Fs, Ps } from 'core/system';

/** Signal fired when npm has a newer stable vexflow release than vexml pins. */
export const VEXFLOW_SIGNAL = 'vexml.vexflow-updated';

const REGISTRY_URL = 'https://registry.npmjs.org/vexflow/latest';
const FETCH_TIMEOUT_MS = 15_000;

/** Version diff emitted by `vex check-vexflow` and attached to `vexml.vexflow-updated`. */
export interface VexflowUpdate {
	pinned: string;
	latest: string;
	majorBump: boolean;
}

/** Source of the newest published vexflow version. */
export interface VexflowRegistry {
	latestVersion(): Promise<string>;
}

/** Reads vexflow's `latest` dist-tag from the public npm registry. */
export class NpmVexflowRegistry implements VexflowRegistry {
	async latestVersion(): Promise<string> {
		const response = await fetch(REGISTRY_URL, {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
		if (!response.ok) {
			throw new Error(`npm registry returned ${response.status}`);
		}
		const body = (await response.json()) as { version?: unknown };
		if (typeof body.version !== 'string' || body.version.trim() === '') {
			throw new Error('npm registry response missing vexflow version');
		}
		return body.version.trim();
	}
}

export interface CheckVexflowOptions {
	fire: boolean;
	force: boolean;
	seed: boolean;
	log: Logger;
	fs: Fs;
	ps: Ps;
	registry?: VexflowRegistry;
}

/**
 * Checks whether npm has a newer stable `vexflow` release than
 * `packages/vexml/package.json` pins. In default probe mode, exits 0 with JSON
 * on an update, 1 when up to date, and 2 on check failure. With `--fire`,
 * fires `vexml.vexflow-updated` once per new version and exits 0 when up to
 * date or already signaled.
 */
export async function checkVexflow(opts: CheckVexflowOptions): Promise<void> {
	if (opts.seed && opts.fire) {
		throw new Error('--seed and --fire are incompatible');
	}

	const registry = opts.registry ?? new NpmVexflowRegistry();
	let pinned: string;
	let latest: string;
	try {
		pinned = await readPinnedVersion(opts.fs, opts.ps.cwd());
		latest = await registry.latestVersion();
	} catch (error) {
		opts.log.error(
			`vexflow check failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		// Exit 2 distinguishes a broken check from probe exit 1 (up to date).
		opts.ps.exit(2);
		return;
	}

	if (opts.seed) {
		const statePath = await stateFilePath(opts.ps);
		await writeState(opts.fs, statePath, latest);
		opts.log.info(`seeded vexflow state at ${latest}`);
		return;
	}

	if (Bun.semver.order(latest, pinned) <= 0) {
		opts.log.info(`vexflow is up to date (${pinned})`);
		if (!opts.fire) {
			opts.ps.exit(1);
		}
		return;
	}

	const update: VexflowUpdate = {
		pinned,
		latest,
		majorBump: majorOf(latest) > majorOf(pinned),
	};

	if (!opts.fire) {
		opts.log.info(JSON.stringify(update));
		return;
	}

	const statePath = await stateFilePath(opts.ps);
	const prior = await readState(opts.fs, statePath);
	if (!opts.force && prior?.version === latest) {
		opts.log.info(`vexflow ${latest} already signaled`);
		return;
	}

	const fired = await opts.ps.spawnCapture([
		'splates',
		'signal',
		'fire',
		VEXFLOW_SIGNAL,
		'--data',
		JSON.stringify(update),
	]);
	if (fired.exitCode !== 0) {
		const detail = fired.stderr.trim() || fired.stdout.trim();
		opts.log.error(
			`failed to fire ${VEXFLOW_SIGNAL}: ${detail || `exit ${fired.exitCode}`}`,
		);
		opts.ps.exit(2);
		return;
	}

	await writeState(opts.fs, statePath, latest);
	opts.log.info(`fired ${VEXFLOW_SIGNAL} (${pinned} -> ${latest})`);
}

interface FiredState {
	version: string;
	firedAt: string;
}

async function readPinnedVersion(fs: Fs, vexmlRoot: string): Promise<string> {
	const pkgPath = resolve(vexmlRoot, 'packages/vexml/package.json');
	const raw = await fs.read(pkgPath);
	const parsed = JSON.parse(raw) as {
		dependencies?: Record<string, unknown>;
	};
	const spec = parsed.dependencies?.vexflow;
	if (typeof spec !== 'string' || spec.trim() === '') {
		throw new Error(`vexflow dependency missing in ${pkgPath}`);
	}
	return spec.trim().replace(/^[\^~=<>]+/, '');
}

async function stateFilePath(ps: Ps): Promise<string> {
	const git = await ps.spawnCapture(['git', 'rev-parse', '--git-common-dir']);
	if (git.exitCode !== 0 || git.stdout.trim() === '') {
		throw new Error('could not locate git common directory');
	}
	const commonDir = resolve(ps.cwd(), git.stdout.trim());
	return resolve(commonDir, 'splates/vexflow-last-fired.json');
}

async function readState(fs: Fs, path: string): Promise<FiredState | null> {
	if (!(await fs.exists(path))) {
		return null;
	}
	try {
		const parsed = JSON.parse(await fs.read(path)) as Partial<FiredState>;
		if (typeof parsed.version !== 'string') {
			return null;
		}
		return {
			version: parsed.version,
			firedAt: typeof parsed.firedAt === 'string' ? parsed.firedAt : '',
		};
	} catch {
		return null;
	}
}

async function writeState(
	fs: Fs,
	path: string,
	version: string,
): Promise<void> {
	await fs.mkdir(dirname(path));
	const state: FiredState = { version, firedAt: new Date().toISOString() };
	await fs.write(path, `${JSON.stringify(state, null, '\t')}\n`);
}

function majorOf(version: string): number {
	return Number(version.split('.')[0] ?? 0);
}
