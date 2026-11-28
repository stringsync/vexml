import { createHash } from 'node:crypto';
import * as path from 'node:path';
import type { Fs } from 'core/system';
import { PNG } from 'pngjs';
import { z } from 'zod';
import { MARKS_DIR, readGeometry } from './render-geometry';
import { extractDrawFixtures, sliceRuleCheck } from './rule-check-slice';
import { cropRect, type PixelRect, parseRuleChecks } from './rule-checks';
import {
	type LedgerRuleRow,
	type RuleCheckState,
	type RuleFingerprint,
	readLedger,
} from './rule-ledger';
import {
	parseRendererAgreement,
	type RendererAgreement,
	RULE_NOTES_DIR,
	ruleSnapshot,
} from './rule-notes';

/** Reads the same rule inputs from a worktree or a committed Git tree. */
export class RuleFingerprints {
	private readonly pngCache = new Map<string, PNG | null>();

	constructor(
		private readonly source: Pick<Fs, 'exists' | 'read' | 'readBytes'>,
	) {}

	async readRules(): Promise<LedgerRuleRow[]> {
		return (await readLedger(this.source)).flatMap((file) => file.rows);
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

		const screenshot = await this.fingerprintScreenshot(fixtureName, noteText);

		if (checkState === 'active' && (await this.hasFailingMarks(row.id))) {
			checkState = 'failing';
		}

		let rendererAgreement: RendererAgreement | null = null;
		if (noteText) {
			try {
				rendererAgreement = parseRendererAgreement(noteText);
			} catch (error) {
				throw new Error(`rules/${row.id}.md: ${(error as Error).message}`);
			}
		}

		return {
			fingerprint: { note, fixture, screenshot, measurements },
			fixtureName,
			checkState,
			subjective: noteText ? subjectiveReason(noteText) : null,
			rendererAgreement,
			fixTask: testText !== null ? fixTaskFor(testText, row.id) : null,
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

	private async fingerprintScreenshot(
		fixtureName: string,
		noteText: string | null,
	): Promise<string | null> {
		const screenshotPath = path.join(
			SCREENSHOTS_DIR,
			ruleSnapshot(fixtureName),
		);
		if (!(await this.source.exists(screenshotPath))) {
			return null;
		}
		const rawBytes = await this.source.readBytes(screenshotPath);
		const fullHash = sha256(rawBytes);
		const checks = noteText ? parseRuleChecks(noteText) : [];
		if (checks.length === 0) {
			return fullHash;
		}
		const geometry = await readGeometry(this.source, fixtureName);
		if (!geometry) {
			return fullHash;
		}
		const png = this.decodePng(fullHash, rawBytes);
		if (!png) {
			return fullHash;
		}
		const rects: PixelRect[] = [];
		for (const check of checks) {
			const rect = cropRect(check.crop, geometry, png);
			if (!rect) {
				return fullHash;
			}
			rects.push(rect);
		}
		return hashCropPixels(png, rects);
	}

	private decodePng(key: string, bytes: Uint8Array): PNG | null {
		if (this.pngCache.has(key)) {
			return this.pngCache.get(key) ?? null;
		}
		let decoded: PNG | null = null;
		try {
			decoded = PNG.sync.read(Buffer.from(bytes));
		} catch {
			decoded = null;
		}
		this.pngCache.set(key, decoded);
		return decoded;
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

export { MARKS_DIR };
export const ENGRAVING_FIXTURES_DIR = 'packages/integration/__data__/engraving';
export const SCREENSHOTS_DIR = 'packages/integration/__screenshots__';
export const INTEGRATION_DIR = 'packages/integration';

/** Computed fingerprint, fixture stem, and automated check state for a rule. */
export interface RuleFingerprintResult {
	fingerprint: RuleFingerprint;
	fixtureName: string;
	checkState: RuleCheckState;
	/** Why a person must decide the rule, from its note's `### Why a person decides`, or null. */
	subjective: string | null;
	/** Agreement across Behind Bars, MuseScore, Verovio, and OSMD from `### Renderers`, or null. */
	rendererAgreement: RendererAgreement | null;
	/** The fix task a `// fix: #<n>` comment above the rule's check names, or null. */
	fixTask: number | null;
}

/** The heading a rule note uses to send its rule to the user rather than let its check settle it. */
export const SUBJECTIVE_HEADING = '### Why a person decides';

/** The text under a note's `### Why a person decides` heading, or null when it has none. */
export function subjectiveReason(note: string): string | null {
	const lines = note.split('\n');
	const start = lines.findIndex((line) => line.trim() === SUBJECTIVE_HEADING);
	if (start === -1) {
		return null;
	}
	const body: string[] = [];
	for (const line of lines.slice(start + 1)) {
		if (/^#{1,3} /.test(line)) {
			break;
		}
		body.push(line);
	}
	return body.join('\n').trim() || 'flagged without a reason';
}

/**
 * The task named by a `// fix: #<n>` line in the comment block right above the check whose
 * title starts with `<ruleId> (`, or null.
 */
export function fixTaskFor(source: string, ruleId: string): number | null {
	const lines = source.split('\n');
	const title = new RegExp(
		`\\b(?:it|test)(?:\\.\\w+)?\\(\\s*['"\`]${ruleId} \\(`,
	);
	const at = lines.findIndex((line) => title.test(line));
	for (let i = at - 1; i >= 0; i--) {
		const line = lines[i]?.trim() ?? '';
		if (!line.startsWith('//')) {
			break;
		}
		const match = /\bfix: #(\d+)/.exec(line);
		if (match?.[1]) {
			return Number(match[1]);
		}
	}
	return null;
}

function hashCropPixels(png: PNG, rects: PixelRect[]): string {
	const hash = createHash('sha256');
	hash.update('crop-v1\0');
	for (const rect of rects) {
		hash.update(`${rect.w}x${rect.h}\0`);
		for (let y = rect.y; y < rect.y + rect.h; y++) {
			const start = (y * png.width + rect.x) * 4;
			hash.update(png.data.subarray(start, start + rect.w * 4));
		}
	}
	return hash.digest('hex');
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
