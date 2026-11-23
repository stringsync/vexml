import { createHash } from 'node:crypto';
import * as path from 'node:path';
import type { Fs } from 'core/system';
import { PNG } from 'pngjs';
import { z } from 'zod';
import { parseSnapshotNotes } from './review';
import type { AgentMark } from './review-data';
import type { RuleFixScope } from './rule-fix-review';
import {
	RULE_INBOX_IMAGE_PATH,
	type RuleInboxData,
	type RuleInboxEntry,
	type RuleInboxEntryStatus,
	type RuleInboxPanel,
	SIGNIFICANT_PIXEL_SHARE,
} from './rule-inbox-data';
import {
	computePixelDiff,
	type GitCommitRef,
	type PixelDiffResult,
	type RuleInboxGit,
	SystemRuleInboxGit,
} from './rule-inbox-git';
import type { FingerprintPart } from './rule-ledger';
import { readRuleNotes, ruleSnapshot } from './rule-notes';
import {
	diffFingerprints,
	MARKS_DIR,
	type RuleStatusEntry,
	RuleVerdicts,
	SCREENSHOTS_DIR,
	VERDICTS_DIR,
} from './rule-verdicts';

export {
	computePixelDiff,
	type GitCommitRef,
	type PixelDiffResult,
	type RuleInboxGit,
	SystemRuleInboxGit,
};

/** Collected rule inbox payload alongside in-memory PNG panels for serving. */
export interface CollectedRuleInbox {
	data: RuleInboxData;
	panels: Map<string, Partial<Record<RuleInboxPanel, Buffer>>>;
}

export interface CollectRuleInboxOptions {
	fs: Fs;
	git?: RuleInboxGit;
	sitting?: number;
	fix?: RuleFixScope;
	/** Optional pixel-share threshold override (defaults to `SIGNIFICANT_PIXEL_SHARE`, 1%). */
	significantPixelShare?: number;
}

/**
 * Classifies an evaluated rule for the inbox:
 * passing mechanical checks (`checkState === 'active'`) auto-pass when only
 * the render shifted below `significantPixelShare`; visual checks, failures, rejections,
 * spec/test changes, and significant visual shifts enter the inbox.
 */
export function classifyInboxStatus(
	entry: Pick<RuleStatusEntry, 'status' | 'checkState' | 'changedParts'>,
	pixelShare: number,
	significantPixelShare = SIGNIFICANT_PIXEL_SHARE,
): RuleInboxEntryStatus | null {
	if (entry.status === 'out-of-scope') {
		return null;
	}
	const mechanicalPass = entry.checkState === 'active';
	if (entry.status === 'approved') {
		return 'approved';
	}
	if (entry.status === 'rejected' || entry.status === 'needs-decision') {
		return 'rejected';
	}
	if (entry.status === 'new') {
		return 'new';
	}
	const onlyScreenshotChanged =
		entry.changedParts.length === 1 && entry.changedParts[0] === 'screenshot';
	if (
		mechanicalPass &&
		onlyScreenshotChanged &&
		pixelShare < significantPixelShare
	) {
		return 'auto-passed';
	}
	return 'changed';
}

/** Collects every Behind Bars rule, its renders, diffs, marks, and inbox classification. */
export async function collectRuleInbox(
	opts: CollectRuleInboxOptions,
): Promise<CollectedRuleInbox> {
	const { fs } = opts;
	const git = opts.git ?? new SystemRuleInboxGit();
	const threshold = opts.significantPixelShare ?? SIGNIFICANT_PIXEL_SHARE;
	const verdicts = new RuleVerdicts(fs);
	const [statuses, ruleNotes, marksBySnapshot] = await Promise.all([
		verdicts.statuses(),
		readRuleNotes(fs),
		loadAgentMarks(fs),
	]);

	const entries: RuleInboxEntry[] = [];
	const panels = new Map<string, Partial<Record<RuleInboxPanel, Buffer>>>();

	const { fix } = opts;
	if (fix) {
		const known = new Set(statuses.map((item) => item.id));
		const unknown = [...fix.targets].filter((id) => !known.has(id));
		if (unknown.length) {
			throw new Error(`Unknown Behind Bars rules: ${unknown.join(', ')}`);
		}
	}
	for (const item of statuses) {
		const base = fix?.baseRules.get(item.id);
		const changedParts = base
			? diffFingerprints(item.fingerprint, base.fingerprint)
			: item.changedParts;
		if (fix && base && changedParts.length === 0 && !fix.targets.has(item.id)) {
			continue;
		}
		if (!fix && item.status === 'out-of-scope') {
			continue;
		}
		const snapshotName = ruleSnapshot(item.fixtureName);
		const afterPath = path.join(SCREENSHOTS_DIR, snapshotName);
		const afterBytes = (await fs.exists(afterPath))
			? Buffer.from(await fs.readBytes(afterPath))
			: null;
		const afterPng = afterBytes ? safeReadPng(afterBytes) : null;

		let beforeBytes: Buffer | null = null;
		let diffBytes: Buffer | null = null;
		let pixelChanged = 0;
		let pixelShare = 0;
		let changeSummary: string | null = null;

		if (fix && base) {
			const bytes = await fix.readBaseImage(
				path.join(SCREENSHOTS_DIR, ruleSnapshot(base.fixtureName)),
			);
			beforeBytes = bytes ? Buffer.from(bytes) : null;
			const beforePng = beforeBytes ? safeReadPng(beforeBytes) : null;
			if (beforePng && afterPng) {
				const diff = computePixelDiff(beforePng, afterPng);
				diffBytes = diff.diffPng;
				pixelChanged = diff.changed;
				pixelShare = diff.share;
			}
			changeSummary = changedParts.length
				? `${describeChangedParts(changedParts)} since main`
				: 'Targeted by this fix';
		} else if (!fix && item.status === 'changed' && item.verdict) {
			const history = await resolveChangedBaseline({
				item,
				afterPng,
				snapshotPath: afterPath,
				git,
			});
			beforeBytes = history.beforeBytes;
			diffBytes = history.diffBytes;
			pixelChanged = history.pixelChanged;
			pixelShare = history.pixelShare;
			changeSummary = history.changeSummary;
		}

		const inboxStatus = fix
			? scopedStatus(base !== undefined, changedParts)
			: classifyInboxStatus(item, pixelShare, threshold);
		if (inboxStatus === null) {
			continue;
		}

		const entryPanels: Partial<Record<RuleInboxPanel, Buffer>> = {};
		if (afterBytes) {
			entryPanels.after = afterBytes;
		}
		if (beforeBytes) {
			entryPanels.before = beforeBytes;
		}
		if (diffBytes) {
			entryPanels.diff = diffBytes;
		}
		panels.set(item.id, entryPanels);

		const noteMarkdown = ruleNotes.get(ruleSnapshot(item.id));
		const parsedNote = parseSnapshotNotes(noteMarkdown);
		const imageUrl = (panel: RuleInboxPanel) =>
			`${RULE_INBOX_IMAGE_PATH}/${encodeURIComponent(item.id)}/${panel}.png`;

		entries.push({
			id: item.id,
			page: item.page,
			pageNumber: item.pageNumber,
			section: item.section,
			rule: item.rule,
			ruleHtml: parsedNote.guide?.rule ?? null,
			testCaseHtml: parsedNote.guide?.testCase ?? null,
			lookForHtml: parsedNote.guide?.lookFor ?? null,
			status: inboxStatus,
			changedParts,
			changeSummary,
			approvedDate:
				item.verdict?.verdict === 'approved' ? item.verdict.date : null,
			priorNote: item.verdict?.note.trim() || null,
			priorTask: item.verdict?.task ?? null,
			checkState: item.checkState,
			fingerprint: item.fingerprint,
			pixelChanged,
			pixelShare,
			width: afterPng?.width ?? 0,
			height: afterPng?.height ?? 0,
			images: {
				after: imageUrl('after'),
				...(beforeBytes ? { before: imageUrl('before') } : {}),
				...(diffBytes ? { diff: imageUrl('diff') } : {}),
			},
			agentMarks:
				marksBySnapshot.get(snapshotName) ??
				marksBySnapshot.get(ruleSnapshot(item.id)) ??
				[],
		});
	}

	entries.sort(compareInboxEntries);
	const autoPassedCount = entries.filter(
		(entry) => entry.status === 'auto-passed',
	).length;

	return {
		data: {
			fix: fix ? true : undefined,
			entries,
			autoPassedCount,
			sitting: opts.sitting ?? 1,
		},
		panels,
	};
}

function scopedStatus(
	hasBaseline: boolean,
	changedParts: readonly FingerprintPart[],
): RuleInboxEntryStatus {
	if (!hasBaseline) {
		return 'new';
	}
	return changedParts.length ? 'changed' : 'targeted';
}

/** Sort by review priority, then by book page. */
function compareInboxEntries(a: RuleInboxEntry, b: RuleInboxEntry): number {
	return (
		STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] ||
		a.pageNumber - b.pageNumber ||
		a.id.localeCompare(b.id)
	);
}

const STATUS_PRIORITY: Record<RuleInboxEntryStatus, number> = {
	targeted: 0,
	changed: 0,
	rejected: 0,
	new: 1,
	approved: 2,
	'auto-passed': 3,
};

interface ResolveBaselineOptions {
	item: RuleStatusEntry;
	afterPng: PNG | null;
	snapshotPath: string;
	git: RuleInboxGit;
}

async function resolveChangedBaseline(opts: ResolveBaselineOptions): Promise<{
	beforeBytes: Buffer | null;
	diffBytes: Buffer | null;
	pixelChanged: number;
	pixelShare: number;
	changeSummary: string | null;
}> {
	const { item, afterPng, snapshotPath, git } = opts;
	const expectedShot = item.verdict?.fingerprint.screenshot ?? null;
	const verdictRepoPath = toRepoPath(
		path.join(VERDICTS_DIR, `${item.id}.json`),
	);
	const shotRepoPath = toRepoPath(snapshotPath);

	let baseCommit: string | null = null;
	let beforeBytes: Buffer | null = null;

	const verdictCommits = await git.log([verdictRepoPath], 5);
	for (const commit of verdictCommits) {
		const candidate = await git.showBytes(commit.hash, shotRepoPath);
		if (candidate && (!expectedShot || sha256(candidate) === expectedShot)) {
			baseCommit = commit.hash;
			beforeBytes = Buffer.from(candidate);
			break;
		}
	}

	if (!beforeBytes && expectedShot) {
		const shotCommits = await git.log([shotRepoPath], 30);
		for (const commit of shotCommits) {
			const candidate = await git.showBytes(commit.hash, shotRepoPath);
			if (candidate && sha256(candidate) === expectedShot) {
				baseCommit = commit.hash;
				beforeBytes = Buffer.from(candidate);
				break;
			}
		}
	}

	let diffBytes: Buffer | null = null;
	let pixelChanged = 0;
	let pixelShare = 0;
	if (beforeBytes && afterPng) {
		const beforePng = safeReadPng(beforeBytes);
		if (beforePng) {
			const diff = computePixelDiff(beforePng, afterPng);
			pixelChanged = diff.changed;
			pixelShare = diff.share;
			diffBytes = diff.diffPng;
		}
	}

	let changeSummary: string | null = null;
	if (baseCommit) {
		const latest = await git.latestChangeSince(baseCommit, [shotRepoPath]);
		if (latest?.subject) {
			changeSummary = `after ${latest.subject}`;
		}
	}
	if (!changeSummary && item.changedParts.length > 0) {
		changeSummary = describeChangedParts(item.changedParts);
	}

	return { beforeBytes, diffBytes, pixelChanged, pixelShare, changeSummary };
}

function describeChangedParts(parts: readonly FingerprintPart[]): string {
	const labels: Record<FingerprintPart, string> = {
		note: 'rule note',
		fixture: 'fixture',
		screenshot: 'render',
		measurements: 'check',
	};
	return `${parts.map((p) => labels[p]).join(', ')} changed`;
}

function toRepoPath(vexmlRelativePath: string): string {
	return path.posix.join('vexml', vexmlRelativePath.replaceAll('\\', '/'));
}

function sha256(data: Uint8Array): string {
	return createHash('sha256').update(data).digest('hex');
}

function safeReadPng(bytes: Uint8Array): PNG | null {
	try {
		return PNG.sync.read(Buffer.from(bytes));
	} catch {
		return null;
	}
}

const markPointSchema = z.object({ x: z.number(), y: z.number() });
const marksFileSchema = z.object({
	screenshot: z.string(),
	marks: z.array(
		z.object({
			kind: z.enum(['bracket', 'line', 'box']),
			role: z.enum(['measure', 'reference']),
			from: markPointSchema,
			to: markPointSchema,
			label: z.string(),
			note: z.string().optional(),
			pass: z.boolean().optional(),
		}),
	),
});

async function loadAgentMarks(fs: Fs): Promise<Map<string, AgentMark[]>> {
	const bySnapshot = new Map<string, AgentMark[]>();
	let entries: string[];
	try {
		entries = await fs.readdir(MARKS_DIR);
	} catch {
		return bySnapshot;
	}
	const files = entries.filter((name) => name.endsWith('.marks.json')).sort();
	for (const file of files) {
		try {
			const parsed = marksFileSchema.safeParse(
				JSON.parse(await fs.read(path.join(MARKS_DIR, file))),
			);
			if (parsed.success && parsed.data.marks.length > 0) {
				bySnapshot.set(parsed.data.screenshot, parsed.data.marks);
			}
		} catch {
			// Skip malformed mark files rather than breaking the inbox.
		}
	}
	return bySnapshot;
}
