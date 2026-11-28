import * as path from 'node:path';
import type { Fs } from 'core/system';
import { z } from 'zod';
import { parseRuleChecks } from './rule-checks';
import { RuleFingerprints } from './rule-fingerprints';
import {
	deriveLedgerStatus,
	FINGERPRINT_PARTS,
	type FingerprintPart,
	isOutOfScopeStatus,
	type LedgerRuleRow,
	parseLedgerSections,
	RULE_TREATMENTS,
	type RuleCheckState,
	type RuleCheckVerdict,
	type RuleFingerprint,
	type RuleReviewStatus,
	type RuleTreatment,
	type RuleVerdict,
	type RuleVerdictAuthor,
	readLedger,
	updateLedgerCounts,
	updateLedgerStatuses,
} from './rule-ledger';
import { type RendererAgreement, RULE_NOTES_DIR } from './rule-notes';

export {
	ENGRAVING_FIXTURES_DIR,
	INTEGRATION_DIR,
	MARKS_DIR,
	SCREENSHOTS_DIR,
} from './rule-fingerprints';

/** Committed verdict ledger beside `ENGRAVING.md`, excluded from the public mirror. */
export const VERDICTS_DIR = 'packages/integration/__reviews__';
/**
 * Fingerprints Behind Bars rules, reads and writes the committed verdict ledger in
 * `packages/integration/__reviews__/`, evaluates each rule's status, and syncs
 * the engraving ledger's Status cells.
 */
export class RuleVerdicts extends RuleFingerprints {
	private writeSeq = 0;

	constructor(private readonly fs: Fs) {
		super(fs);
	}

	/** Reads one rule's recorded verdict, or null when missing. */
	async readVerdict(id: string): Promise<RuleVerdict | null> {
		const file = this.verdictPath(id);
		if (!(await this.fs.exists(file))) {
			return null;
		}
		return verdictSchema.parse(JSON.parse(await this.fs.read(file)));
	}

	/** Reads every verdict in the ledger, treating a missing folder as nothing reviewed yet. */
	async readAllVerdicts(): Promise<Map<string, RuleVerdict>> {
		const verdicts = new Map<string, RuleVerdict>();
		if (!(await this.fs.exists(VERDICTS_DIR))) {
			return verdicts;
		}
		const files = (await this.fs.readdir(VERDICTS_DIR))
			.filter((name) => name.endsWith('.json'))
			.sort();
		for (const file of files) {
			const parsed = verdictSchema.parse(
				JSON.parse(await this.fs.read(path.join(VERDICTS_DIR, file))),
			);
			verdicts.set(parsed.id, parsed);
		}
		return verdicts;
	}

	/** Writes a rule's verdict atomically to `packages/integration/__reviews__/<id>.json`. */
	async writeVerdict(verdict: RuleVerdict): Promise<void> {
		const valid = verdictSchema.parse(verdict);
		const target = this.verdictPath(valid.id);
		await this.fs.mkdir(VERDICTS_DIR, { recursive: true });
		const temp = `${target}.tmp-${process.pid}-${this.writeSeq++}`;
		const payload = `${JSON.stringify(valid, null, '\t')}\n`;
		try {
			await this.fs.write(temp, payload);
			await this.fs.rename(temp, target);
		} catch (error) {
			await this.fs.rm(temp, { force: true }).catch(() => {});
			throw error;
		}
	}

	/** Evaluates every rule in the engraving ledger against the verdict ledger. */
	async statuses(): Promise<RuleStatusEntry[]> {
		const rows = await this.readRules();
		const verdicts = await this.readAllVerdicts();
		const entries: RuleStatusEntry[] = [];

		for (const row of rows) {
			const {
				fingerprint,
				fixtureName,
				checkState,
				subjective,
				rendererAgreement,
				fixTask,
			} = await this.fingerprint(row);
			const verdict = verdicts.get(row.id) ?? null;
			const { status, changedParts } = classifyRuleStatus(
				row,
				fingerprint,
				verdict,
			);
			const derivedLedgerStatus = deriveLedgerStatus({
				currentStatus: row.status,
				reviewStatus: status,
				verdict,
				checkState,
			});
			entries.push({
				id: row.id,
				page: row.page,
				pageNumber: row.pageNumber,
				section: row.section,
				rule: row.rule,
				fixtureName,
				fingerprint,
				verdict,
				status,
				changedParts,
				checkState,
				subjective,
				rendererAgreement,
				fixTask,
				ledgerStatus: row.status,
				derivedLedgerStatus,
			});
		}

		return entries;
	}

	/**
	 * Records a verdict for every new or changed rule that can be settled automatically:
	 * carries forward a user's approval when its own crop did not change, approves a passing
	 * measured check (including disagreed rules whose treatment the user already chose), and
	 * rejects a failing or todo check with a fix task. Leaves subjective, eye-judged,
	 * unchosen-disagreement, and unfiled failures for the user, saying why.
	 */
	async settle(opts: SettleOptions = {}): Promise<SettleResult> {
		const now = opts.now ?? new Date();
		const settled: SettledRule[] = [];
		const left: LeftRule[] = [];
		for (const entry of await this.statuses()) {
			const call = agentCall(entry);
			if (call === null) {
				continue;
			}
			if ('reason' in call) {
				left.push({ id: entry.id, reason: call.reason });
				continue;
			}
			settled.push({ id: entry.id, ...call });
			if (!opts.check) {
				const priorUserVerdict = call.by === 'user' ? entry.verdict : null;
				const reviewedAt = priorUserVerdict
					? priorUserVerdict.reviewedAt
					: now.toISOString();
				await this.writeVerdict({
					id: entry.id,
					fingerprint: entry.fingerprint,
					verdict: call.verdict,
					note: call.note,
					date: priorUserVerdict
						? priorUserVerdict.date
						: now.toISOString().slice(0, 10),
					...(reviewedAt !== undefined ? { reviewedAt } : {}),
					...(call.treatment !== undefined
						? { treatment: call.treatment }
						: {}),
					...(call.task !== undefined ? { task: call.task } : {}),
					by: call.by ?? 'agent',
					...(call.checks !== undefined ? { checks: call.checks } : {}),
				});
			}
		}
		return { settled, left };
	}

	/**
	 * Records user approval at the current fingerprint for one or more rules, preserving any
	 * previously chosen treatment or fix task unless overridden.
	 */
	async approve(
		ids: readonly string[],
		opts: ApproveOptions = {},
	): Promise<ApprovedRule[]> {
		const uniqueIds = [...new Set(ids)];
		if (uniqueIds.length === 0) {
			throw new Error('pass at least one rule id to approve');
		}
		const entriesById = new Map(
			(await this.statuses()).map((entry) => [entry.id, entry]),
		);
		const missing = uniqueIds.filter((id) => !entriesById.has(id));
		if (missing.length > 0) {
			throw new Error(`unknown rule id(s): ${missing.join(', ')}`);
		}

		const now = opts.now ?? new Date();
		const date = now.toISOString().slice(0, 10);
		const reviewedAt = now.toISOString();
		const approved: ApprovedRule[] = [];

		for (const id of uniqueIds) {
			const entry = entriesById.get(id);
			if (!entry) {
				continue;
			}
			const treatment = opts.treatment ?? entry.verdict?.treatment;
			const task = opts.task ?? entry.verdict?.task;
			const note =
				opts.note ??
				(task !== undefined
					? `Approved on fix #${task} sign-off.`
					: 'Approved on fix sign-off.');
			const notePath = path.join(RULE_NOTES_DIR, `${id}.md`);
			const parsedChecks = (await this.fs.exists(notePath))
				? parseRuleChecks(await this.fs.read(notePath))
				: [];
			const checks: RuleCheckVerdict[] | undefined =
				parsedChecks.length > 0
					? parsedChecks.map((check) => ({
							n: check.n,
							question: check.question,
							verdict: 'approved' as const,
							note,
							...(treatment !== undefined ? { treatment } : {}),
						}))
					: undefined;

			await this.writeVerdict({
				id,
				fingerprint: entry.fingerprint,
				verdict: 'approved',
				note,
				date,
				reviewedAt,
				by: 'user',
				...(treatment !== undefined ? { treatment } : {}),
				...(task !== undefined ? { task } : {}),
				...(checks !== undefined ? { checks } : {}),
			});
			approved.push({
				id,
				...(treatment !== undefined ? { treatment } : {}),
				...(task !== undefined ? { task } : {}),
			});
		}

		return approved;
	}

	/**
	 * Updates the ledger's `Status` cells from verdicts and check results, in whichever
	 * file each rule row sits, and the index's per-section `Rules` counts.
	 */
	async syncLedger(opts: SyncLedgerOptions = {}): Promise<LedgerSyncResult> {
		const files = await readLedger(this.fs);
		const entries = await this.statuses();
		const statusesById = new Map<string, string>();
		const changed: LedgerStatusDiff[] = [];

		for (const entry of entries) {
			statusesById.set(entry.id, entry.derivedLedgerStatus);
			if (entry.ledgerStatus !== entry.derivedLedgerStatus) {
				changed.push({
					id: entry.id,
					from: entry.ledgerStatus,
					to: entry.derivedLedgerStatus,
				});
			}
		}

		const [index, ...sections] = files;
		const counts: LedgerCountDiff[] = [];
		const countsByFile = new Map(sections.map((f) => [f.file, f.rows.length]));
		if (index) {
			for (const section of parseLedgerSections(index.markdown)) {
				const count = countsByFile.get(section.file);
				if (count !== undefined && count !== section.rules) {
					counts.push({ file: section.file, from: section.rules, to: count });
				}
			}
		}

		let updated = false;
		for (const file of files) {
			let next = updateLedgerStatuses(file.markdown, statusesById);
			if (file === index) {
				next = updateLedgerCounts(next, countsByFile);
			}
			if (!opts.check && next !== file.markdown) {
				await this.fs.write(file.file, next);
				updated = true;
			}
		}
		return { changed, counts, updated };
	}

	private verdictPath(id: string): string {
		if (!/^[a-z0-9-]+$/i.test(id)) {
			throw new Error(`invalid rule id: ${JSON.stringify(id)}`);
		}
		return path.join(VERDICTS_DIR, `${id}.json`);
	}
}

/** Options for `RuleVerdicts.syncLedger`. */
export interface SyncLedgerOptions {
	/** When true, report drifted rows without writing the ledger. */
	check?: boolean;
}

/** Options for `RuleVerdicts.settle`. */
export interface SettleOptions {
	/** When true, report what would be settled without writing verdicts. */
	check?: boolean;
	/** The decision time recorded on each verdict (default: now). */
	now?: Date;
}

/** A rule settled by `vex rules settle`, either from its check or by carrying forward a user approval. */
export interface SettledRule {
	id: string;
	verdict: 'approved' | 'rejected';
	note: string;
	task?: number;
	by?: RuleVerdictAuthor;
	treatment?: RuleTreatment;
	checks?: RuleCheckVerdict[];
}

/** A new or changed rule left for the user, and why. */
export interface LeftRule {
	id: string;
	reason: string;
}

export interface SettleResult {
	settled: SettledRule[];
	left: LeftRule[];
}

/** Options for `RuleVerdicts.approve`. */
export interface ApproveOptions {
	/** Reason or sign-off note recorded on the verdict. */
	note?: string;
	/** Chosen renderer treatment (defaults to any prior verdict's treatment). */
	treatment?: RuleTreatment;
	/** Fix task number (defaults to any prior verdict's task). */
	task?: number;
	/** The decision time recorded on each verdict (default: now). */
	now?: Date;
}

/** A rule approved by `vex rules approve`. */
export interface ApprovedRule {
	id: string;
	treatment?: RuleTreatment;
	task?: number;
}

/**
 * What the agent may record for a rule: a verdict its check decides or a carried-forward user
 * approval, a reason the user must decide it instead, or null when it needs no verdict (settled
 * already, or out of scope).
 */
export function agentCall(
	entry: Pick<
		RuleStatusEntry,
		| 'status'
		| 'changedParts'
		| 'checkState'
		| 'subjective'
		| 'rendererAgreement'
		| 'fixTask'
		| 'verdict'
	>,
): Omit<SettledRule, 'id'> | { reason: string } | null {
	if (entry.status !== 'new' && entry.status !== 'changed') {
		return null;
	}
	if (
		entry.status === 'changed' &&
		entry.verdict?.verdict === 'approved' &&
		entry.verdict.by !== 'agent' &&
		!entry.changedParts.includes('screenshot') &&
		entry.checkState !== 'failing' &&
		entry.checkState !== 'todo'
	) {
		return {
			verdict: 'approved',
			note: entry.verdict.note,
			by: 'user',
			...(entry.verdict.treatment !== undefined
				? { treatment: entry.verdict.treatment }
				: {}),
			...(entry.verdict.checks !== undefined
				? { checks: entry.verdict.checks }
				: {}),
		};
	}
	if (
		entry.verdict?.verdict === 'needs-decision' &&
		entry.verdict.by !== 'agent'
	) {
		return { reason: 'waits on a decision the user has open' };
	}
	if (entry.subjective !== null) {
		return { reason: `subjective: ${entry.subjective}` };
	}
	if (entry.rendererAgreement?.status === 'disagree') {
		if (
			entry.verdict?.treatment === undefined ||
			entry.checkState !== 'active'
		) {
			return {
				reason: entry.rendererAgreement.summary
					? `renderers disagree: ${entry.rendererAgreement.summary}`
					: 'renderers disagree',
			};
		}
	}
	if (entry.status === 'new' && entry.rendererAgreement === null) {
		return { reason: 'no renderer agreement recorded under ### Renderers' };
	}
	if (entry.checkState === 'none') {
		return { reason: 'judged by eye: no measured check' };
	}
	if (entry.checkState === 'active') {
		return {
			verdict: 'approved',
			note: 'Its measured check passes.',
			...(entry.verdict?.treatment !== undefined
				? { treatment: entry.verdict.treatment }
				: {}),
		};
	}
	if (entry.fixTask === null) {
		return {
			reason:
				'its check fails with no fix task: file one and name it in a `// fix: #<n>` comment above the check',
		};
	}
	return {
		verdict: 'rejected',
		note:
			entry.checkState === 'todo'
				? `Its check is a todo until fix #${entry.fixTask} lands.`
				: `Its check fails; fix #${entry.fixTask} covers it.`,
		task: entry.fixTask,
	};
}

/** Combined state of a Behind Bars rule from the engraving ledger, committed files, and the verdict ledger. */
export interface RuleStatusEntry {
	id: string;
	page: string;
	pageNumber: number;
	section: string;
	rule: string;
	fixtureName: string;
	fingerprint: RuleFingerprint;
	verdict: RuleVerdict | null;
	status: RuleReviewStatus;
	/** Which of the four fingerprint parts moved when `status === 'changed'`. */
	changedParts: FingerprintPart[];
	checkState: RuleCheckState;
	/** Why a person must decide the rule, from its note, or null when its check may settle it. */
	subjective: string | null;
	/** Agreement across Behind Bars, MuseScore, Verovio, and OSMD from `### Renderers`, or null. */
	rendererAgreement: RendererAgreement | null;
	/** The fix task named above its check, or null. */
	fixTask: number | null;
	/** Status currently written in the ledger. */
	ledgerStatus: string;
	/** Status derived from the verdict ledger and automated check state. */
	derivedLedgerStatus: string;
}

/** One row whose `Status` cell in the ledger changed (or would change under `--check`). */
export interface LedgerStatusDiff {
	id: string;
	from: string;
	to: string;
}

/** One section whose `Rules` count in the index changed (or would change under `--check`). */
export interface LedgerCountDiff {
	file: string;
	from: number | null;
	to: number;
}

export interface LedgerSyncResult {
	changed: LedgerStatusDiff[];
	counts: LedgerCountDiff[];
	updated: boolean;
}

/** Returns the fingerprint parts that differ between `current` and `recorded`, in canonical order. */
export function diffFingerprints(
	current: RuleFingerprint,
	recorded: RuleFingerprint,
): FingerprintPart[] {
	return FINGERPRINT_PARTS.filter((part) => current[part] !== recorded[part]);
}

/** Classifies a rule's review status from its ledger row, current fingerprint, and last verdict. */
export function classifyRuleStatus(
	row: Pick<LedgerRuleRow, 'status'>,
	current: RuleFingerprint,
	verdict: RuleVerdict | null,
): { status: RuleReviewStatus; changedParts: FingerprintPart[] } {
	if (isOutOfScopeStatus(row.status)) {
		return { status: 'out-of-scope', changedParts: [] };
	}
	if (!verdict) {
		return { status: 'new', changedParts: [] };
	}
	const changedParts = diffFingerprints(current, verdict.fingerprint);
	if (changedParts.length > 0) {
		return { status: 'changed', changedParts };
	}
	return { status: verdict.verdict, changedParts: [] };
}

const fingerprintSchema = z.object({
	note: z.string().nullable(),
	fixture: z.string().nullable(),
	screenshot: z.string().nullable(),
	measurements: z.string().nullable(),
});

const verdictSchema = z.object({
	id: z.string().min(1),
	fingerprint: fingerprintSchema,
	verdict: z.enum(['approved', 'rejected', 'needs-decision']),
	date: z.string().min(1),
	reviewedAt: z.iso.datetime({ offset: true }).optional(),
	note: z.string(),
	treatment: z.enum(RULE_TREATMENTS).optional(),
	task: z.number().int().positive().optional(),
	by: z.enum(['agent', 'user']).optional(),
	checks: z
		.array(
			z.object({
				n: z.number().int().positive(),
				question: z.string().nullable(),
				verdict: z.enum(['approved', 'rejected', 'unsure']),
				note: z.string(),
				treatment: z.enum(RULE_TREATMENTS).optional(),
				spec: z.string().nullable().optional(),
				crop: z.string().nullable().optional(),
			}),
		)
		.optional(),
});
