import * as path from 'node:path';
import type { Fs } from 'core/system';
import { z } from 'zod';
import { RuleFingerprints } from './rule-fingerprints';
import {
	deriveLedgerStatus,
	FINGERPRINT_PARTS,
	type FingerprintPart,
	isOutOfScopeStatus,
	type LedgerRuleRow,
	type RuleCheckState,
	type RuleFingerprint,
	type RuleReviewStatus,
	type RuleVerdict,
	updateLedgerStatuses,
} from './rule-ledger';
import { LEDGER_FILE } from './rule-notes';

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
 * `ENGRAVING.md`'s Status column.
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
		const payload = `${JSON.stringify(valid, null, 2)}\n`;
		try {
			await this.fs.write(temp, payload);
			await this.fs.rename(temp, target);
		} catch (error) {
			await this.fs.rm(temp, { force: true }).catch(() => {});
			throw error;
		}
	}

	/** Evaluates every rule in `ENGRAVING.md` against the verdict ledger. */
	async statuses(): Promise<RuleStatusEntry[]> {
		const rows = await this.readRules();
		const verdicts = await this.readAllVerdicts();
		const entries: RuleStatusEntry[] = [];

		for (const row of rows) {
			const { fingerprint, fixtureName, checkState } =
				await this.fingerprint(row);
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
				ledgerStatus: row.status,
				derivedLedgerStatus,
			});
		}

		return entries;
	}

	/** Updates the `Status` column of `ENGRAVING.md` from verdicts and check results. */
	async syncLedger(opts: SyncLedgerOptions = {}): Promise<LedgerSyncResult> {
		const markdown = await this.fs.read(LEDGER_FILE);
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

		const nextMarkdown = updateLedgerStatuses(markdown, statusesById);
		const updated = !opts.check && nextMarkdown !== markdown;
		if (updated) {
			await this.fs.write(LEDGER_FILE, nextMarkdown);
		}
		return { changed, updated };
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
	/** When true, report drifted rows without writing `ENGRAVING.md`. */
	check?: boolean;
}

/** Combined state of a Behind Bars rule from `ENGRAVING.md`, committed files, and the verdict ledger. */
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
	/** Status currently written in `ENGRAVING.md`. */
	ledgerStatus: string;
	/** Status derived from the verdict ledger and automated check state. */
	derivedLedgerStatus: string;
}

/** One row whose `Status` cell in `ENGRAVING.md` changed (or would change under `--check`). */
export interface LedgerStatusDiff {
	id: string;
	from: string;
	to: string;
}

export interface LedgerSyncResult {
	changed: LedgerStatusDiff[];
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
	task: z.number().int().positive().optional(),
});
