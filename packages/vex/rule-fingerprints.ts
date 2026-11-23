import { createHash } from 'node:crypto';
import * as path from 'node:path';
import type { Fs } from 'core/system';
import { z } from 'zod';
import { extractDrawFixtures, sliceRuleCheck } from './rule-check-slice';
import {
	type LedgerRuleRow,
	parseLedgerRules,
	type RuleCheckState,
	type RuleFingerprint,
} from './rule-ledger';
import { LEDGER_FILE, RULE_NOTES_DIR, ruleSnapshot } from './rule-notes';

/** Reads the same rule inputs from a worktree or a committed Git tree. */
export class RuleFingerprints {
	constructor(
		private readonly source: Pick<Fs, 'exists' | 'read' | 'readBytes'>,
	) {}

	async readRules(): Promise<LedgerRuleRow[]> {
		return parseLedgerRules(await this.source.read(LEDGER_FILE));
	}

	/** Computes a rule's four-part fingerprint from its committed note, check slice, fixture, and baseline render. */
	async fingerprint(row: LedgerRuleRow): Promise<RuleFingerprintResult> {
		const notePath = path.join(RULE_NOTES_DIR, `${row.id}.md`);
		const noteText = (await this.source.exists(notePath))
			? (await this.source.read(notePath)).trim()
			: null;
		const note = noteText ? sha256(noteText) : null;

		const testText = await this.readCheckFile(row);
		const slice = testText !== null ? sliceRuleCheck(testText, row.id) : null;
		const measurements = slice ? sha256(slice.source) : null;
		let checkState: RuleCheckState = slice ? slice.state : 'none';

		const fixtureName = await this.resolveFixtureName(
			row,
			slice?.fixtures ?? [],
			testText,
		);
		const fixturePath = path.join(
			ENGRAVING_FIXTURES_DIR,
			`${fixtureName}.musicxml`,
		);
		const fixture = (await this.source.exists(fixturePath))
			? sha256(await this.source.read(fixturePath))
			: null;

		const screenshotPath = path.join(
			SCREENSHOTS_DIR,
			ruleSnapshot(fixtureName),
		);
		const screenshot = (await this.source.exists(screenshotPath))
			? sha256(await this.source.readBytes(screenshotPath))
			: null;

		if (checkState === 'active' && (await this.hasFailingMarks(row.id))) {
			checkState = 'failing';
		}

		return {
			fingerprint: { note, fixture, screenshot, measurements },
			fixtureName,
			checkState,
		};
	}

	private async readCheckFile(row: LedgerRuleRow): Promise<string | null> {
		const candidates: string[] = [];
		if (row.linkTarget?.endsWith('.test.ts')) {
			candidates.push(path.join(INTEGRATION_DIR, row.linkTarget));
		}
		candidates.push(path.join(INTEGRATION_DIR, `engraving-${row.id}.test.ts`));
		for (const candidate of candidates) {
			if (await this.source.exists(candidate)) {
				return this.source.read(candidate);
			}
		}
		return null;
	}

	private async resolveFixtureName(
		row: LedgerRuleRow,
		sliceFixtures: string[],
		testText: string | null,
	): Promise<string> {
		if (sliceFixtures[0]) {
			return sliceFixtures[0];
		}
		if (
			await this.source.exists(
				path.join(ENGRAVING_FIXTURES_DIR, `${row.id}.musicxml`),
			)
		) {
			return row.id;
		}
		if (
			row.linkLabel &&
			(await this.source.exists(
				path.join(ENGRAVING_FIXTURES_DIR, `${row.linkLabel}.musicxml`),
			))
		) {
			return row.linkLabel;
		}
		if (testText !== null) {
			const drawn = extractDrawFixtures(testText);
			if (drawn.length === 1 && drawn[0]) {
				return drawn[0];
			}
		}
		return row.id;
	}

	private async hasFailingMarks(id: string): Promise<boolean> {
		const marksPath = path.join(MARKS_DIR, `engraving_${id}.marks.json`);
		if (!(await this.source.exists(marksPath))) {
			return false;
		}
		try {
			const parsed = marksPassSchema.parse(
				JSON.parse(await this.source.read(marksPath)),
			);
			return parsed.marks.some((m) => m.role === 'measure' && m.pass === false);
		} catch {
			return false;
		}
	}
}

export const ENGRAVING_FIXTURES_DIR = 'packages/integration/__data__/engraving';
export const SCREENSHOTS_DIR = 'packages/integration/__screenshots__';
export const MARKS_DIR = 'packages/integration/__marks__';
export const INTEGRATION_DIR = 'packages/integration';

/** Computed fingerprint, fixture stem, and automated check state for a rule. */
export interface RuleFingerprintResult {
	fingerprint: RuleFingerprint;
	fixtureName: string;
	checkState: RuleCheckState;
}

function sha256(data: string | Uint8Array): string {
	return createHash('sha256').update(data).digest('hex');
}

const marksPassSchema = z.object({
	marks: z.array(
		z.object({
			role: z.enum(['measure', 'reference']),
			pass: z.boolean().optional(),
		}),
	),
});
