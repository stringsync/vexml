import { type AgentMark, describeMark, type Mark } from './review-data';
import type {
	FingerprintPart,
	RuleCheckState,
	RuleFingerprint,
} from './rule-ledger';

// What `vex review --rules`'s page and server share: inbox entries, persisted pass state,
// bucket helpers, and the summary message `vex review show --rules` prints.
// Browser-safe: types and pure functions only.

/** Full payload served to the Behind Bars rule review inbox UI. */
export interface RuleInboxData {
	fix?: boolean;
	entries: RuleInboxEntry[];
	autoPassedCount: number;
	sitting: number;
}

/** One Behind Bars rule in the review inbox. */
export interface RuleInboxEntry {
	id: string;
	page: string;
	pageNumber: number;
	section: string;
	/** Plain one-sentence rule statement shown at the top of the card. */
	rule: string;
	/** Rendered HTML for the rule note's `### The rule` section, when present. */
	ruleHtml: string | null;
	/** Rendered HTML for `### The test case`, when present. */
	testCaseHtml: string | null;
	/** Rendered HTML for `### What to look for`, when present. */
	lookForHtml: string | null;
	status: RuleInboxEntryStatus;
	/** Fingerprint parts that moved since the verdict, or since main for a fix review. */
	changedParts: FingerprintPart[];
	/** Short reason the rule returned, e.g. `after #3586 Size beamed stems`. */
	changeSummary: string | null;
	/** Date of the last committed approval, when known (`YYYY-MM-DD`). */
	approvedDate: string | null;
	/** Note from the prior committed verdict, if any. */
	priorNote: string | null;
	/** Linked splates task number from a prior rejection, if any. */
	priorTask: number | null;
	checkState: RuleCheckState;
	fingerprint: RuleFingerprint;
	/** Differing pixels between the approved baseline and the current render. */
	pixelChanged: number;
	/** Differing pixel share (0..1) between the approved baseline and the current render. */
	pixelShare: number;
	width: number;
	height: number;
	images: {
		after: string;
		before?: string;
		diff?: string;
	};
	agentMarks: AgentMark[];
}

export const RULE_INBOX_DATA_PATH = '/api/rule-inbox/data';
export const RULE_INBOX_STATE_PATH = '/api/rule-inbox/state';
export const RULE_INBOX_SUBMIT_PATH = '/api/rule-inbox/submit';
export const RULE_INBOX_IMAGE_PATH = '/api/rule-inbox/image';

/** Visual pixel-change share (1%) above which a render shift re-enters human review. */
export const SIGNIFICANT_PIXEL_SHARE = 0.01;

export type RuleInboxPanel = 'before' | 'diff' | 'after';

export type RuleInboxEntryStatus =
	| 'changed'
	| 'targeted'
	| 'rejected'
	| 'new'
	| 'approved'
	| 'auto-passed';

export type RuleInboxVerdict = 'approved' | 'rejected';

export type RuleInboxBucket = 'review' | 'done' | 'auto';

/** One verdict recorded in the user's in-progress or submitted pass. */
export interface RuleInboxDecision {
	verdict: RuleInboxVerdict;
	note: string;
	/** Arrows and boxes drawn on the score with a rejection, each with its own note. */
	marks?: Mark[];
	fingerprint: RuleFingerprint;
	updatedAt: string;
}

/** Persisted out-of-worktree state for the Behind Bars rule review inbox. */
export interface RuleInboxState {
	sitting: number;
	decisions: Record<string, RuleInboxDecision>;
	submittedAt: string | null;
	submittedSitting: number;
}

export function emptyRuleInboxState(sitting = 1): RuleInboxState {
	return {
		sitting,
		decisions: {},
		submittedAt: null,
		submittedSitting: 0,
	};
}

/** Whether two four-part fingerprints match exactly. */
export function fingerprintsEqual(
	a: RuleFingerprint,
	b: RuleFingerprint,
): boolean {
	return (
		a.note === b.note &&
		a.fixture === b.fixture &&
		a.screenshot === b.screenshot &&
		a.measurements === b.measurements
	);
}

/**
 * Returns the saved pass decision for `entry` only if it was made against `entry`'s
 * current fingerprint; a rule that moved since the decision must be judged again.
 */
export function effectiveDecision(
	entry: Pick<RuleInboxEntry, 'id' | 'fingerprint'>,
	state: RuleInboxState,
): RuleInboxDecision | null {
	const decision = state.decisions[entry.id];
	if (!decision) {
		return null;
	}
	return fingerprintsEqual(decision.fingerprint, entry.fingerprint)
		? decision
		: null;
}

/** Which drawer bucket a rule belongs to given its baseline status and current pass state. */
export function ruleBucket(
	entry: Pick<RuleInboxEntry, 'id' | 'status' | 'fingerprint'>,
	state: RuleInboxState,
): RuleInboxBucket {
	const decision = effectiveDecision(entry, state);
	if (decision !== null) {
		return 'done';
	}
	if (entry.status === 'auto-passed') {
		return 'auto';
	}
	if (entry.status === 'approved') {
		return 'done';
	}
	return 'review';
}

/** Current verdict shown for a `done` rule (`approved` or `rejected`), or null if still open/auto. */
export function ruleDoneVerdict(
	entry: Pick<RuleInboxEntry, 'id' | 'status' | 'fingerprint'>,
	state: RuleInboxState,
): RuleInboxVerdict | null {
	const decision = effectiveDecision(entry, state);
	if (decision !== null) {
		return decision.verdict;
	}
	return entry.status === 'approved' ? 'approved' : null;
}

/** Number of valid decisions staged in the current pass. */
export function countPendingDecisions(
	data: RuleInboxData,
	state: RuleInboxState,
): number {
	return data.entries.filter(
		(entry) => effectiveDecision(entry, state) !== null,
	).length;
}

/** Saved decisions that match the review evidence shown in this pass. */
export function reviewedDecisions(data: RuleInboxData, state: RuleInboxState) {
	return data.entries.flatMap((entry) => {
		const decision = effectiveDecision(entry, state);
		return decision
			? [
					{
						id: entry.id,
						...decision,
						page: entry.page,
						section: entry.section,
					},
				]
			: [];
	});
}

/** Formats a submitted (or draft) rule inbox pass as plain text + JSON for agents. */
export function formatRuleInboxMessage(
	data: RuleInboxData,
	state: RuleInboxState,
): string {
	const judged = reviewedDecisions(data, state);
	const approved = judged.filter((item) => item.verdict === 'approved');
	const rejected = judged.filter((item) => item.verdict === 'rejected');
	const remaining = data.entries.filter(
		(entry) => ruleBucket(entry, state) === 'review',
	).length;
	const submitted =
		state.submittedAt !== null && state.submittedSitting === state.sitting;

	const lines = [
		`[VEX RULE INBOX sitting ${state.sitting}]`,
		[
			`${approved.length} approved`,
			`${rejected.length} rejected`,
			`${remaining} left to review`,
			`${data.autoPassedCount} auto-passed`,
		].join('; ') + (submitted ? '.' : '. (Draft: not submitted yet.)'),
	];

	for (const decision of judged) {
		const mark = decision.verdict === 'approved' ? '✓' : '✗';
		lines.push('', `## ${mark} ${decision.id} (${decision.verdict})`);
		if (decision.note.trim()) {
			lines.push(decision.note.trim());
		}
		for (const [i, mark] of (decision.marks ?? []).entries()) {
			// The rule inbox has no score layout, so a mark is told by its pixels.
			const note = mark.note.trim();
			lines.push(
				`${i + 1}. ${describeMark(mark, null)}${note ? `: ${note}` : ''}`,
			);
		}
	}

	lines.push(
		'',
		'```json',
		JSON.stringify({
			sitting: state.sitting,
			submitted,
			submittedAt: state.submittedAt,
			decisions: judged,
		}),
		'```',
	);
	return lines.join('\n');
}
