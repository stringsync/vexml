import { join } from 'node:path';
import type { Ps } from 'core/system';
import {
	type RuleFingerprintResult,
	RuleFingerprints,
} from './rule-fingerprints';
import { SystemRuleInboxGit } from './rule-inbox-git';

export interface RuleFixScope {
	targets: ReadonlySet<string>;
	baseRules: ReadonlyMap<string, RuleFingerprintResult>;
	readBaseImage(path: string): Promise<Uint8Array | null>;
}

export async function loadRuleFixReview(ps: Ps, ids: string) {
	const targets = new Set(ids.split(',').map((id) => id.trim()));
	if ([...targets].some((id) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))) {
		throw new Error('--fix expects comma-separated Behind Bars rule IDs');
	}

	const [base, gitDir] = await Promise.all([
		gitOutput(ps, ['rev-parse', '--verify', 'refs/heads/main^{commit}']),
		gitOutput(ps, ['rev-parse', '--absolute-git-dir']),
	]);
	const paths = new Set(
		(
			await gitOutput(ps, [
				'ls-tree',
				'-r',
				'-z',
				'--full-tree',
				'--name-only',
				base,
				'--',
				'vexml/packages/integration',
			])
		).split('\0'),
	);
	const git = new SystemRuleInboxGit();
	const cache = new Map<string, Promise<Uint8Array>>();
	const readBytes = (file: string): Promise<Uint8Array> => {
		const existing = cache.get(file);
		if (existing) {
			return existing;
		}
		const read = git.showBytes(base, `vexml/${file}`).then((bytes) => {
			if (!bytes) {
				throw new Error(`Could not read ${file} at ${base}`);
			}
			return bytes;
		});
		cache.set(file, read);
		return read;
	};
	const fingerprints = new RuleFingerprints({
		exists: async (file) => paths.has(`vexml/${file}`),
		read: async (file) => Buffer.from(await readBytes(file)).toString('utf8'),
		readBytes,
	});
	const baseRules = new Map<string, RuleFingerprintResult>();
	for (const row of await fingerprints.readRules()) {
		baseRules.set(row.id, await fingerprints.fingerprint(row));
	}
	const scope: RuleFixScope = {
		targets,
		baseRules,
		readBaseImage: (file) =>
			paths.has(`vexml/${file}`) ? readBytes(file) : Promise.resolve(null),
	};
	return { scope, dir: join(gitDir, 'vex-rule-fix-review') };
}

async function gitOutput(ps: Ps, args: string[]): Promise<string> {
	const result = await ps.spawnCapture(['git', ...args]);
	if (result.exitCode !== 0) {
		throw new Error(result.stderr.trim() || `git ${args[0]} failed`);
	}
	return result.stdout.trim();
}
