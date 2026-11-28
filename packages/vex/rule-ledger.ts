import * as path from 'node:path';
import type { Fs } from 'core/system';

/** The ledger's index: the sweep's process and one row per section, linking its rule file. */
export const LEDGER_FILE = 'packages/integration/ENGRAVING.md';

/** One markdown file of the ledger and the rule rows it holds. */
export interface LedgerFile {
	/** Path from the vexml root. */
	file: string;
	markdown: string;
	rows: LedgerRuleRow[];
}

/**
 * Reads the ledger: the index and every section file its section table links, in index
 * order. Each row's `linkTarget` is resolved against `packages/integration/`, wherever
 * its file sits.
 */
export async function readLedger(
	source: Pick<Fs, 'exists' | 'read'>,
): Promise<LedgerFile[]> {
	const index = await source.read(LEDGER_FILE);
	const files: LedgerFile[] = [
		{ file: LEDGER_FILE, markdown: index, rows: parseLedgerRules(index) },
	];
	for (const section of parseLedgerSections(index)) {
		if (!(await source.exists(section.file))) {
			throw new Error(
				`${LEDGER_FILE} links ${section.target}, which does not exist`,
			);
		}
		const markdown = await source.read(section.file);
		const rows = parseLedgerRules(markdown).map((row) => ({
			...row,
			linkTarget: row.linkTarget && resolveLink(section.file, row.linkTarget),
		}));
		files.push({ file: section.file, markdown, rows });
	}
	return files;
}

/** One row of the index's section table (headed by `| Pages |`). */
export interface LedgerSection {
	/** The section file's path from the vexml root. */
	file: string;
	/** The link target as written in the index. */
	target: string;
	/** The `Rules` count written in the index, or null when the cell is not a number. */
	rules: number | null;
	lineIndex: number;
}

/** Parses the index's section table: each row whose Section cell links a markdown file. */
export function parseLedgerSections(index: string): LedgerSection[] {
	const sections: LedgerSection[] = [];
	let columns: string[] | null = null;
	const lines = index.split('\n');
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex] ?? '';
		if (!line.trim().startsWith('|')) {
			columns = null;
			continue;
		}
		const cells = splitTableRow(line);
		if (cells[0] === 'Pages') {
			columns = cells;
			continue;
		}
		if (!columns || !cells[0] || /^-+$/.test(cells[0])) {
			continue;
		}
		const link = parseMarkdownLink(cells[columns.indexOf('Section')] ?? '');
		if (!link?.target.endsWith('.md')) {
			continue;
		}
		const count = cells[columns.indexOf('Rules')] ?? '';
		sections.push({
			file: path.join(path.dirname(LEDGER_FILE), link.target),
			target: link.target,
			rules: /^\d+$/.test(count) ? Number(count) : null,
			lineIndex,
		});
	}
	return sections;
}

/** Rewrites the index's `Rules` cells to the given count per section file. */
export function updateLedgerCounts(
	index: string,
	countsByFile: ReadonlyMap<string, number>,
): string {
	const lines = index.split('\n');
	const header = lines.find((line) => splitTableRow(line)[0] === 'Pages');
	const column = header ? splitTableRow(header).indexOf('Rules') : -1;
	if (column < 0) {
		return index;
	}
	for (const section of parseLedgerSections(index)) {
		const count = countsByFile.get(section.file);
		const line = lines[section.lineIndex];
		if (count === undefined || count === section.rules || line === undefined) {
			continue;
		}
		const cells = splitTableRow(line);
		cells[column] = String(count);
		lines[section.lineIndex] = `| ${cells.join(' | ')} |`;
	}
	return lines.join('\n');
}

function resolveLink(file: string, target: string): string {
	return path.relative(
		path.dirname(LEDGER_FILE),
		path.join(path.dirname(file), target),
	);
}

/** Parses every rule row from a ledger file's tables (those headed by `| Id |`). */
export function parseLedgerRules(markdown: string): LedgerRuleRow[] {
	const rows: LedgerRuleRow[] = [];
	const lines = markdown.split('\n');
	let section = '';
	let inTable = false;

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex] ?? '';
		const trimmed = line.trim();
		const heading = /^#{1,2} (.+)$/.exec(trimmed);
		if (heading?.[1]) {
			section = heading[1].trim();
			inTable = false;
			continue;
		}
		if (!trimmed.startsWith('|')) {
			inTable = false;
			continue;
		}
		const cells = splitTableRow(line);
		if (cells[0] === 'Id') {
			inTable = true;
			continue;
		}
		if (!inTable || !cells[0] || /^-+$/.test(cells[0])) {
			continue;
		}
		const id = cells[0];
		const page = cells[1] ?? '';
		const rule = cells[2] ?? '';
		const status = cells[3] ?? '';
		const link = cells[4] ?? '';
		const parsedLink = parseMarkdownLink(link);
		rows.push({
			id,
			page,
			pageNumber: parseFirstPage(page),
			rule,
			status,
			link,
			linkTarget: parsedLink?.target ?? null,
			linkLabel: parsedLink?.label ?? null,
			section,
			lineIndex,
		});
	}
	return rows;
}

/** Whether a ledger row's Status marks the rule as out of scope for the sweep. */
export function isOutOfScopeStatus(status: string): boolean {
	return /^out of scope\b/i.test(status.trim());
}

/**
 * Derives a rule's `Status` column in `ENGRAVING.md` from its verdict and check state.
 * Unreviewed or changed rules stay `pending` until human review approves them; out-of-scope
 * rows keep their exclusion reason untouched.
 */
export function deriveLedgerStatus(input: DeriveStatusInput): string {
	if (
		input.reviewStatus === 'out-of-scope' ||
		isOutOfScopeStatus(input.currentStatus)
	) {
		return input.currentStatus;
	}
	if (input.reviewStatus === 'new' || input.reviewStatus === 'changed') {
		return 'pending';
	}
	if (input.reviewStatus === 'needs-decision') {
		return 'needs decision';
	}
	if (input.reviewStatus === 'rejected') {
		return input.verdict?.task !== undefined
			? `fails → #${input.verdict.task}`
			: 'rejected';
	}
	// Approved against the current fingerprint.
	if (input.checkState === 'failing' || input.checkState === 'todo') {
		return 'fails';
	}
	if (input.checkState === 'none') {
		return 'judged by eye';
	}
	return 'pass';
}

/**
 * Rewrites only the `Status` cell of matching rule rows in `ENGRAVING.md`, preserving every
 * other line, heading, prose block, and cell verbatim.
 */
export function updateLedgerStatuses(
	markdown: string,
	statusesById: ReadonlyMap<string, string>,
): string {
	const lines = markdown.split('\n');
	const rows = parseLedgerRules(markdown);
	for (const row of rows) {
		const nextStatus = statusesById.get(row.id);
		if (nextStatus === undefined || nextStatus === row.status) {
			continue;
		}
		const line = lines[row.lineIndex];
		if (line === undefined) {
			continue;
		}
		const cells = splitTableRow(line);
		if (cells.length < 5) {
			continue;
		}
		cells[3] = nextStatus;
		lines[row.lineIndex] = `| ${cells.join(' | ')} |`;
	}
	return lines.join('\n');
}

/** The four committed inputs that make up a Behind Bars rule's fingerprint. */
export const FINGERPRINT_PARTS = [
	'note',
	'fixture',
	'screenshot',
	'measurements',
] as const;

export type FingerprintPart = (typeof FINGERPRINT_PARTS)[number];

/** SHA-256 hex digest of each committed input for a rule, or null when absent. */
export interface RuleFingerprint {
	note: string | null;
	fixture: string | null;
	screenshot: string | null;
	measurements: string | null;
}

/** What the reviewer decided for a rule at a specific fingerprint. */
export type RuleVerdictKind = 'approved' | 'rejected' | 'needs-decision';

/** Which renderer's treatment the reviewer chose for a rule or check. */
export const RULE_TREATMENTS = [
	'vexml',
	'behind-bars',
	'musescore',
	'verovio',
	'osmd',
] as const;

export type RuleTreatment = (typeof RULE_TREATMENTS)[number];

/** One committed review verdict stored in `packages/integration/__reviews__/<id>.json`. */
export interface RuleVerdict {
	id: string;
	fingerprint: RuleFingerprint;
	verdict: RuleVerdictKind;
	/** ISO date (`YYYY-MM-DD`) or timestamp when the verdict was recorded. */
	date: string;
	/** Exact decision time, for ordering repeated reviews. */
	reviewedAt?: string;
	/** User note explaining a rejection, open decision, or approval caveat. */
	note: string;
	/** Which treatment the reviewer chose when renderers disagreed or on a targeted rejection. */
	treatment?: RuleTreatment;
	/** Optional linked splates task number for a rejected rule. */
	task?: number;
	/**
	 * Who settled it: `agent` when its measured check decided it (`vex rules settle`), `user`
	 * (the default when absent) from a review question.
	 */
	by?: RuleVerdictAuthor;
	/**
	 * The reviewer's verdict on each check the rule's note declares, from which `verdict`
	 * follows: rejected when any check is, needs-decision when any is unsure, else approved.
	 */
	checks?: RuleCheckVerdict[];
}

/** One check's verdict; older verdicts also carry the hashes of the question and crop the retired review page showed. */
export interface RuleCheckVerdict {
	/** The check's position under the note's `### Checks`. */
	n: number;
	question: string | null;
	verdict: 'approved' | 'rejected' | 'unsure';
	note: string;
	/** Which treatment the reviewer chose for this check, when specified. */
	treatment?: RuleTreatment;
	/** sha256 of the check's lines in the note, or null for a rule with no declared checks. */
	spec?: string | null;
	/** sha256 of the crop's PNG, or null when there was no crop. */
	crop?: string | null;
}

/** Who recorded a verdict. */
export type RuleVerdictAuthor = 'agent' | 'user';

/** Overall review state of a rule when its current fingerprint is compared to the ledger. */
export type RuleReviewStatus =
	| 'new'
	| 'changed'
	| 'rejected'
	| 'needs-decision'
	| 'approved'
	| 'out-of-scope';

/** State of a rule's automated check, derived from its test block and any recorded marks. */
export type RuleCheckState = 'active' | 'todo' | 'failing' | 'none';

/** One rule row parsed from `packages/integration/ENGRAVING.md`. */
export interface LedgerRuleRow {
	id: string;
	page: string;
	/** First numeric page for book-order sorting, or Infinity when unparseable. */
	pageNumber: number;
	rule: string;
	status: string;
	link: string;
	/** Link target inside `[label](target)`, relative to `packages/integration/`, or null when absent. */
	linkTarget: string | null;
	/** Link label inside `[label](target)`, or null when absent. */
	linkLabel: string | null;
	/** Enclosing `#` or `##` heading in its ledger file. */
	section: string;
	/** 0-based line index in its ledger file. */
	lineIndex: number;
}

/** Inputs to derive a rule's `Status` cell in `ENGRAVING.md`. */
export interface DeriveStatusInput {
	currentStatus: string;
	reviewStatus: RuleReviewStatus;
	verdict: RuleVerdict | null;
	checkState: RuleCheckState;
}

function splitTableRow(line: string): string[] {
	return line
		.split('|')
		.slice(1, -1)
		.map((cell) => cell.trim());
}

function parseMarkdownLink(
	cell: string,
): { label: string; target: string } | null {
	const match = /\[([^\]]+)\]\(([^)]+)\)/.exec(cell);
	if (!match?.[1] || !match[2]) {
		return null;
	}
	return { label: match[1].trim(), target: match[2].trim() };
}

function parseFirstPage(page: string): number {
	const match = /\d+/.exec(page);
	return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}
