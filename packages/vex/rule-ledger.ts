/** Parses every rule row from `ENGRAVING.md` tables (those headed by `| Id |`). */
export function parseLedgerRules(markdown: string): LedgerRuleRow[] {
	const rows: LedgerRuleRow[] = [];
	const lines = markdown.split('\n');
	let section = '';
	let inTable = false;

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex] ?? '';
		const trimmed = line.trim();
		if (trimmed.startsWith('## ')) {
			section = trimmed.slice(3).trim();
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

/** One committed review verdict stored in `packages/integration/__reviews__/<id>.json`. */
export interface RuleVerdict {
	id: string;
	fingerprint: RuleFingerprint;
	verdict: RuleVerdictKind;
	/** ISO date (`YYYY-MM-DD`) or timestamp when the verdict was recorded. */
	date: string;
	/** Exact decision time from the inbox, for ordering repeated submissions. */
	reviewedAt?: string;
	/** User note explaining a rejection, open decision, or approval caveat. */
	note: string;
	/** Optional linked splates task number for a rejected rule. */
	task?: number;
}

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
	/** Link target inside `[label](target)`, or null when absent. */
	linkTarget: string | null;
	/** Link label inside `[label](target)`, or null when absent. */
	linkLabel: string | null;
	/** Enclosing `## ...` section heading in `ENGRAVING.md`. */
	section: string;
	/** 0-based line index in `ENGRAVING.md`. */
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
