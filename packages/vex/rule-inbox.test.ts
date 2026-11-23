import { describe, expect, it } from 'bun:test';
import { FakeFs } from 'core/system/testing';
import { PNG } from 'pngjs';
import {
	classifyInboxStatus,
	collectRuleInbox,
	computePixelDiff,
	type GitCommitRef,
	type RuleInboxGit,
} from './rule-inbox';
import {
	effectiveDecision,
	emptyRuleInboxState,
	formatRuleInboxMessage,
	type RuleInboxEntry,
	reviewedDecisions,
	ruleBucket,
} from './rule-inbox-data';
import { RuleInboxStore } from './rule-inbox-store';
import { LEDGER_FILE, RULE_NOTES_DIR } from './rule-notes';
import {
	ENGRAVING_FIXTURES_DIR,
	INTEGRATION_DIR,
	MARKS_DIR,
	RuleVerdicts,
	SCREENSHOTS_DIR,
} from './rule-verdicts';

describe('rule inbox', () => {
	it('puts new rules in review regardless of their check state', () => {
		expect(
			classifyInboxStatus(
				{ status: 'new', checkState: 'active', changedParts: [] },
				0,
			),
		).toBe('new');
		expect(
			classifyInboxStatus(
				{ status: 'new', checkState: 'none', changedParts: [] },
				0,
			),
		).toBe('new');
		expect(
			classifyInboxStatus(
				{ status: 'new', checkState: 'failing', changedParts: [] },
				0,
			),
		).toBe('new');
	});

	it('auto-passes minor screenshot-only drift under 1% on passing mechanical checks, but surfaces >= 1% shifts or spec changes', () => {
		expect(
			classifyInboxStatus(
				{
					status: 'changed',
					checkState: 'active',
					changedParts: ['screenshot'],
				},
				0.004,
			),
		).toBe('auto-passed');

		expect(
			classifyInboxStatus(
				{
					status: 'changed',
					checkState: 'active',
					changedParts: ['screenshot'],
				},
				0.015,
			),
		).toBe('changed');

		expect(
			classifyInboxStatus(
				{
					status: 'changed',
					checkState: 'active',
					changedParts: ['fixture', 'screenshot'],
				},
				0.002,
			),
		).toBe('changed');
	});

	it('counts changed pixels and paints added ink red and removed ink blue', () => {
		const before = PNG.sync.read(makePng(10, 10, [[1, 1]]));
		const after = PNG.sync.read(makePng(10, 10, [[2, 2]]));
		const diff = computePixelDiff(before, after);
		expect(diff.changed).toBe(2);
		expect(diff.share).toBeCloseTo(0.02);

		const out = PNG.sync.read(diff.diffPng);
		// (2,2) was darkened in After -> red
		const addedAt = (2 * 10 + 2) * 4;
		expect([
			out.data[addedAt],
			out.data[addedAt + 1],
			out.data[addedAt + 2],
		]).toEqual([220, 38, 38]);
		// (1,1) was ink in Before and white in After -> blue
		const removedAt = (1 * 10 + 1) * 4;
		expect([
			out.data[removedAt],
			out.data[removedAt + 1],
			out.data[removedAt + 2],
		]).toEqual([37, 99, 235]);
	});

	it('keeps visual, changed and rejected rules in order and resolves the approved baseline from git', async () => {
		const fs = new FakeFs();
		await fs.write(LEDGER_FILE, VISUAL_ONLY_LEDGER);
		await fs.write(
			`${RULE_NOTES_DIR}/stem-length.md`,
			'### The rule\n\nA stem is 3½ spaces.\n',
		);
		await fs.write(
			`${ENGRAVING_FIXTURES_DIR}/stem-length.musicxml`,
			'<score-partwise/>',
		);
		await fs.write(
			`${INTEGRATION_DIR}/engraving-stem-length.test.ts`,
			PASSING_CHECK_TEST,
		);

		const baselinePng = makePng(10, 10, [[1, 1]]);
		const movedPng = makePng(10, 10, [
			[1, 1],
			[2, 2],
			[3, 3],
		]); // 2% change (>= 1%)
		await fs.writeBytes(
			`${SCREENSHOTS_DIR}/engraving_stem-length.png`,
			baselinePng,
		);
		await fs.writeBytes(
			`${SCREENSHOTS_DIR}/engraving_beam-angle.png`,
			makePng(10, 10),
		);
		await fs.writeBytes(
			`${SCREENSHOTS_DIR}/engraving_whole-rest.png`,
			makePng(10, 10),
		);

		const verdicts = new RuleVerdicts(fs);
		const initial = await verdicts.statuses();
		const stem = requireRuleStatus(initial, 'stem-length');
		const rest = requireRuleStatus(initial, 'whole-rest');
		await verdicts.writeVerdict({
			id: stem.id,
			fingerprint: stem.fingerprint,
			verdict: 'approved',
			date: '2026-11-20',
			note: '',
		});
		await verdicts.writeVerdict({
			id: rest.id,
			fingerprint: rest.fingerprint,
			verdict: 'rejected',
			date: '2026-11-21',
			note: 'rest sits too high',
			task: 3612,
		});

		// Now shift stem-length render by 2% (>= 1% threshold).
		await fs.writeBytes(
			`${SCREENSHOTS_DIR}/engraving_stem-length.png`,
			movedPng,
		);

		const shotRepoPath = `vexml/${SCREENSHOTS_DIR}/engraving_stem-length.png`;
		const verdictRepoPath =
			'vexml/packages/integration/__reviews__/stem-length.json';
		const git = new FakeGit(
			{ [verdictRepoPath]: [{ hash: 'abc123', subject: 'record verdict' }] },
			{ [`abc123:${shotRepoPath}`]: baselinePng },
			{
				[`abc123:${shotRepoPath}`]: {
					hash: 'def456',
					subject: '#3586 Size beamed stems',
				},
			},
		);

		const collected = await collectRuleInbox({ fs, git, sitting: 2 });
		// Order: changed & rejected by page (stem-length p.14, whole-rest p.34), then new (beam-angle p.20); out-of-scope omitted.
		expect(collected.data.entries.map((e) => [e.id, e.status])).toEqual([
			['stem-length', 'changed'],
			['whole-rest', 'rejected'],
			['beam-angle', 'new'],
		]);

		const stemEntry = collected.data.entries[0];
		expect(stemEntry?.pixelChanged).toBe(2);
		expect(stemEntry?.pixelShare).toBeCloseTo(0.02);
		expect(stemEntry?.changeSummary).toBe('after #3586 Size beamed stems');
		expect(stemEntry?.approvedDate).toBe('2026-11-20');
		expect(stemEntry?.images.before).toBeDefined();
		expect(stemEntry?.images.diff).toBeDefined();
		expect(collected.panels.get('stem-length')?.before).toBeDefined();
		expect(collected.panels.get('stem-length')?.diff).toBeDefined();
	});

	it('includes unchanged targets and fingerprint changes, even with no verdict or a small render shift', async () => {
		const fs = new FakeFs();
		await fs.write(LEDGER_FILE, VISUAL_ONLY_LEDGER);
		const baseline = makePng(20, 20);
		const shot = `${SCREENSHOTS_DIR}/engraving_stem-length.png`;
		await fs.writeBytes(shot, baseline);
		const verdicts = new RuleVerdicts(fs);
		const baseRules = new Map(
			(await verdicts.statuses()).map((entry) => [entry.id, entry]),
		);
		const stem = requireRuleStatus([...baseRules.values()], 'stem-length');
		await verdicts.writeVerdict({
			id: stem.id,
			fingerprint: stem.fingerprint,
			verdict: 'approved',
			date: '2026-11-20',
			note: '',
		});
		await fs.writeBytes(shot, makePng(20, 20, [[1, 1]]));
		await fs.write(`${RULE_NOTES_DIR}/beam-angle.md`, 'Changed rule note');
		const result = await collectRuleInbox({
			fs,
			fix: {
				targets: new Set(['whole-rest']),
				baseRules,
				readBaseImage: async (file) => (file === shot ? baseline : null),
			},
		});

		expect(
			result.data.entries.map(({ id, status, changedParts }) => [
				id,
				status,
				changedParts,
			]),
		).toEqual([
			['stem-length', 'changed', ['screenshot']],
			['beam-angle', 'changed', ['note']],
			['whole-rest', 'targeted', []],
		]);
		expect(result.data.autoPassedCount).toBe(0);
		expect(result.panels.get('stem-length')?.before).toEqual(baseline);
		expect(result.panels.get('stem-length')?.diff).toBeDefined();
	});

	it('surfaces failing marks on a new mechanical rule instead of auto-passing it', async () => {
		const fs = new FakeFs();
		await fs.write(LEDGER_FILE, VISUAL_ONLY_LEDGER);
		await fs.write(
			`${INTEGRATION_DIR}/engraving-stem-length.test.ts`,
			PASSING_CHECK_TEST,
		);
		await fs.writeBytes(
			`${SCREENSHOTS_DIR}/engraving_stem-length.png`,
			makePng(10, 10),
		);
		await fs.write(
			`${MARKS_DIR}/engraving_stem-length.marks.json`,
			JSON.stringify({
				screenshot: 'engraving_stem-length.png',
				marks: [
					{
						kind: 'bracket',
						role: 'measure',
						from: { x: 1, y: 1 },
						to: { x: 1, y: 5 },
						label: '2¾',
						pass: false,
					},
				],
			}),
		);

		const collected = await collectRuleInbox({ fs, git: new FakeGit() });
		const stem = collected.data.entries.find((e) => e.id === 'stem-length');
		expect(stem?.status).toBe('new');
		expect(stem?.agentMarks).toHaveLength(1);
	});

	it('ignores stale decisions whose fingerprint no longer matches and formats messages cleanly', () => {
		const fp1 = {
			note: 'n1',
			fixture: 'f1',
			screenshot: 's1',
			measurements: 'm1',
		};
		const fp2 = { ...fp1, screenshot: 's2' };
		const state = {
			...emptyRuleInboxState(3),
			submittedAt: '2026-11-23T15:00:00Z',
			submittedSitting: 3,
			decisions: {
				'stem-length': {
					verdict: 'approved' as const,
					note: '',
					fingerprint: fp1,
					updatedAt: '2026-11-23T14:55:00Z',
				},
				'beam-angle': {
					verdict: 'rejected' as const,
					note: 'slope too steep',
					fingerprint: fp1,
					updatedAt: '2026-11-23T14:56:00Z',
				},
			},
		};

		expect(
			effectiveDecision({ id: 'stem-length', fingerprint: fp2 }, state),
		).toBeNull();
		expect(
			ruleBucket(
				{ id: 'stem-length', status: 'changed', fingerprint: fp2 },
				state,
			),
		).toBe('review');
		expect(
			ruleBucket({ id: 'beam-angle', status: 'new', fingerprint: fp1 }, state),
		).toBe('done');

		const beam: RuleInboxEntry = {
			id: 'beam-angle',
			page: '20',
			pageNumber: 20,
			section: 'Beams',
			rule: 'Beams slope at most one space.',
			ruleHtml: null,
			testCaseHtml: null,
			lookForHtml: null,
			status: 'new',
			changedParts: [],
			changeSummary: null,
			approvedDate: null,
			priorNote: null,
			priorTask: null,
			checkState: 'none',
			fingerprint: fp1,
			pixelChanged: 0,
			pixelShare: 0,
			width: 10,
			height: 10,
			images: { after: '/api/rule-inbox/image/beam-angle/after.png' },
			agentMarks: [],
		};
		const data = {
			sitting: 3,
			autoPassedCount: 4,
			entries: [beam, { ...beam, id: 'stem-length', fingerprint: fp2 }],
		};
		expect(reviewedDecisions(data, state)).toEqual([
			{
				id: 'beam-angle',
				...state.decisions['beam-angle'],
				page: '20',
				section: 'Beams',
			},
		]);

		const message = formatRuleInboxMessage(data, state);
		expect(message).toContain('[VEX RULE INBOX sitting 3]');
		expect(message).toContain(
			'0 approved; 1 rejected; 1 left to review; 4 auto-passed.',
		);
		expect(message).toContain('## ✗ beam-angle (rejected)');
		expect(message).toContain('slope too steep');
	});

	const marksFingerprint = {
		note: 'n1',
		fixture: 'f1',
		screenshot: 's1',
		measurements: 'm1',
	};
	const rejectionMarks = [
		{
			kind: 'box' as const,
			panel: 'after' as const,
			from: { x: 40, y: 10 },
			to: { x: 60, y: 50 },
			note: 'stem reads short',
		},
		{
			kind: 'arrow' as const,
			panel: 'diff' as const,
			from: { x: 5, y: 5 },
			to: { x: 20, y: 30 },
			note: '',
		},
	];
	const markedState = {
		...emptyRuleInboxState(2),
		decisions: {
			'stem-length': {
				verdict: 'rejected' as const,
				note: 'too short',
				marks: rejectionMarks,
				fingerprint: marksFingerprint,
				updatedAt: '2026-11-23T14:56:00Z',
			},
		},
	};

	it('lists each mark under its rejection, numbered, with its note', () => {
		const entry = {
			id: 'stem-length',
			fingerprint: marksFingerprint,
		} as RuleInboxEntry;
		const message = formatRuleInboxMessage(
			{ sitting: 2, autoPassedCount: 0, entries: [entry] },
			markedState,
		);
		expect(message).toContain(
			'too short\n1. Box on After (40,10 20×40): stem reads short\n2. Arrow on Diff (5,5 → 20,30)',
		);
		expect(message).toContain('"marks":[{"kind":"box"');
	});

	it('saves marks with a decision and still reads a pass saved without them', async () => {
		const store = new RuleInboxStore(new FakeFs(), '/inbox');
		await store.writeState(markedState);
		expect(await store.readState()).toEqual(markedState);

		const { marks: _, ...plain } = markedState.decisions['stem-length'];
		const older = { ...markedState, decisions: { 'stem-length': plain } };
		await store.writeState(older);
		expect(await store.readState()).toEqual(older);
	});
});

function makePng(
	width: number,
	height: number,
	darkPixels: Array<[number, number]> = [],
): Buffer {
	const png = new PNG({ width, height });
	png.data.fill(255);
	for (const [x, y] of darkPixels) {
		const at = (y * width + x) * 4;
		png.data[at] = 20;
		png.data[at + 1] = 20;
		png.data[at + 2] = 20;
		png.data[at + 3] = 255;
	}
	return PNG.sync.write(png);
}

class FakeGit implements RuleInboxGit {
	constructor(
		private readonly commits: Record<string, GitCommitRef[]> = {},
		private readonly files: Record<string, Uint8Array> = {},
		private readonly latestSince: Record<string, GitCommitRef | null> = {},
	) {}

	async log(repoPaths: string[]): Promise<GitCommitRef[]> {
		return this.commits[repoPaths[0] ?? ''] ?? [];
	}

	async showBytes(
		commit: string,
		repoPath: string,
	): Promise<Uint8Array | null> {
		return this.files[`${commit}:${repoPath}`] ?? null;
	}

	async latestChangeSince(
		sinceCommit: string,
		repoPaths: string[],
	): Promise<GitCommitRef | null> {
		return this.latestSince[`${sinceCommit}:${repoPaths[0] ?? ''}`] ?? null;
	}
}

const PASSING_CHECK_TEST = `
import { describe, expect, it } from 'bun:test';
import { draw, engrave } from './engraving-render';

describe('stem-length', () => {
	it('draws', async () => {
		expect(await draw('stem-length')).toMatchScreenshot('engraving_stem-length.png');
	});
	it('measures', async () => {
		const e = await engrave('stem-length');
		expect(e.check([[3.5]])).toMatchMeasurements([[3.5]]);
	});
});
`;

const VISUAL_ONLY_LEDGER = [
	'# Engraving',
	'',
	'## 5–37: Ground rules: stems, beams and rests',
	'',
	'| Id | Page | Rule | Status | Link |',
	'| --- | --- | --- | --- | --- |',
	'| stem-length | 14 | A stem is 3½ spaces. | pass | [stem-length](engraving-stem-length.test.ts) |',
	'| beam-angle | 20 | Beams slope at most one space. | pending |  |',
	'| whole-rest | 34 | Whole rest hangs below line 4. | pending |  |',
	'| stave-lines | 5 | Out of scope rule. | out of scope: terminology |  |',
	'',
].join('\n');

function requireRuleStatus<T extends { id: string }>(
	items: T[],
	id: string,
): T {
	const found = items.find((item) => item.id === id);
	if (!found) {
		throw new Error(`expected rule status for ${id}`);
	}
	return found;
}
