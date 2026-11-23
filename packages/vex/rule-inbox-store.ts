import * as path from 'node:path';
import type { Fs, Ps } from 'core/system';
import { z } from 'zod';
import { PANELS } from './review-data';
import { emptyRuleInboxState, type RuleInboxState } from './rule-inbox-data';

const FALLBACK_DIR = '.vex/rule-inbox';

/**
 * Resolves the shared out-of-worktree directory for the Behind Bars rule inbox:
 * `<git-common-dir>/vex-rule-inbox`, so state survives worktree deletion and merges
 * without ever touching tracked files on main.
 */
export async function resolveRuleInboxDir(ps: Ps): Promise<string> {
	const { exitCode, stdout } = await ps.spawnCapture([
		'git',
		'rev-parse',
		'--path-format=absolute',
		'--git-common-dir',
	]);
	const commonDir = stdout.trim();
	if (exitCode === 0 && commonDir) {
		return path.join(commonDir, 'vex-rule-inbox');
	}
	return FALLBACK_DIR;
}

/**
 * Reads and writes Behind Bars rule inbox progress atomically in a shared directory
 * outside any worktree, keeping saved decisions intact across sittings and merges.
 */
export class RuleInboxStore {
	private writeChain: Promise<void> = Promise.resolve();
	private writeSeq = 0;

	constructor(
		private readonly fs: Fs,
		readonly dir: string,
	) {}

	private get stateFile(): string {
		return path.join(this.dir, 'state.json');
	}

	async readState(): Promise<RuleInboxState> {
		if (!(await this.fs.exists(this.stateFile))) {
			return emptyRuleInboxState(1);
		}
		try {
			const parsed = ruleInboxStateSchema.safeParse(
				JSON.parse(await this.fs.read(this.stateFile)),
			);
			return parsed.success ? parsed.data : emptyRuleInboxState(1);
		} catch {
			return emptyRuleInboxState(1);
		}
	}

	async writeState(state: RuleInboxState): Promise<void> {
		const valid = ruleInboxStateSchema.parse(state);
		await this.writeAtomic(
			this.stateFile,
			`${JSON.stringify(valid, null, 2)}\n`,
		);
	}

	async readSubmission(sitting: number): Promise<RuleInboxState | null> {
		const file = this.submissionFile(sitting);
		return (await this.fs.exists(file))
			? ruleInboxStateSchema.parse(JSON.parse(await this.fs.read(file)))
			: null;
	}

	private submissionFile(sitting: number): string {
		return path.join(this.dir, 'submissions', `sitting-${sitting}.json`);
	}

	/**
	 * Marks the current sitting submitted, snapshots it under `submissions/sitting-<n>.json`,
	 * and persists the updated state.
	 */
	async markSubmitted(submittedAt: string): Promise<RuleInboxState> {
		const current = await this.readState();
		const next: RuleInboxState = {
			...current,
			submittedAt,
			submittedSitting: current.sitting,
		};
		await this.writeAtomic(
			this.submissionFile(next.sitting),
			`${JSON.stringify(next, null, 2)}\n`,
		);
		await this.writeState(next);
		return next;
	}

	private writeAtomic(target: string, content: string): Promise<void> {
		const run = async () => {
			await this.fs.mkdir(path.dirname(target), { recursive: true });
			const temp = `${target}.tmp-${process.pid}-${this.writeSeq++}`;
			try {
				await this.fs.write(temp, content);
				await this.fs.rename(temp, target);
			} catch (error) {
				await this.fs.rm(temp, { force: true }).catch(() => {});
				throw error;
			}
		};
		const next = this.writeChain.then(run, run);
		this.writeChain = next.catch(() => {});
		return next;
	}
}

const fingerprintSchema = z.object({
	note: z.string().nullable(),
	fixture: z.string().nullable(),
	screenshot: z.string().nullable(),
	measurements: z.string().nullable(),
});

const pointSchema = z.object({ x: z.number(), y: z.number() });

const markSchema = z.object({
	kind: z.enum(['box', 'arrow', 'pin']),
	panel: z.enum(PANELS),
	from: pointSchema,
	to: pointSchema,
	note: z.string(),
});

const decisionSchema = z.object({
	verdict: z.enum(['approved', 'rejected']),
	note: z.string(),
	marks: z.array(markSchema).optional(),
	fingerprint: fingerprintSchema,
	updatedAt: z.string(),
});

export const ruleInboxStateSchema = z.object({
	sitting: z.number().int().positive(),
	decisions: z.record(z.string(), decisionSchema),
	submittedAt: z.string().nullable(),
	submittedSitting: z.number().int().nonnegative(),
});
