import { describe, expect, it } from 'bun:test';
import { FakeFs } from 'core/system/testing';
import { fixTaskFor, subjectiveReason } from './rule-fingerprints';
import type { RuleVerdict } from './rule-ledger';
import { LEDGER_FILE, RULE_NOTES_DIR } from './rule-notes';
import {
	agentCall,
	ENGRAVING_FIXTURES_DIR,
	INTEGRATION_DIR,
	RuleVerdicts,
	SCREENSHOTS_DIR,
} from './rule-verdicts';

describe('agent settling', () => {
	it('approves a unanimous passing check and rejects a unanimous failing one with its fix task', () => {
		const base = {
			changedParts: [] as const,
			subjective: null,
			rendererAgreement: UNANIMOUS,
			fixTask: null,
			verdict: null,
		};
		expect(
			agentCall({
				...base,
				changedParts: [],
				status: 'new',
				checkState: 'active',
			}),
		).toMatchObject({ verdict: 'approved' });
		expect(
			agentCall({
				...base,
				changedParts: [],
				status: 'new',
				checkState: 'todo',
				fixTask: 7,
			}),
		).toMatchObject({ verdict: 'rejected', task: 7 });
		expect(
			agentCall({
				...base,
				changedParts: ['measurements'],
				status: 'changed',
				checkState: 'failing',
				fixTask: 7,
			}),
		).toMatchObject({ verdict: 'rejected', task: 7 });
		// Consensus (Behind Bars + MuseScore or 2+ digital renderers) settles like unanimous.
		expect(
			agentCall({
				...base,
				changedParts: [],
				rendererAgreement: CONSENSUS,
				status: 'new',
				checkState: 'active',
			}),
		).toMatchObject({ verdict: 'approved' });
		expect(
			agentCall({
				...base,
				changedParts: [],
				rendererAgreement: CONSENSUS,
				status: 'new',
				checkState: 'todo',
				fixTask: 9,
			}),
		).toMatchObject({ verdict: 'rejected', task: 9 });
		// Legacy changed rules without ### Renderers still settle unless they record disagreement.
		expect(
			agentCall({
				...base,
				changedParts: ['measurements'],
				rendererAgreement: null,
				status: 'changed',
				checkState: 'active',
			}),
		).toMatchObject({ verdict: 'approved' });
	});

	it('leaves disagreed, unrecorded-new, subjective, eye-judged, unfiled and open-decision rules for the user', () => {
		const base = {
			changedParts: [],
			subjective: null,
			rendererAgreement: UNANIMOUS,
			fixTask: null,
			verdict: null,
		};
		const reason = (call: ReturnType<typeof agentCall>) =>
			call && 'reason' in call ? call.reason : null;
		expect(
			reason(
				agentCall({
					...base,
					status: 'new',
					checkState: 'active',
					rendererAgreement: DISAGREE,
				}),
			),
		).toBe('renderers disagree: MuseScore differs (straight stem)');
		expect(
			reason(
				agentCall({
					...base,
					status: 'new',
					checkState: 'todo',
					fixTask: 7,
					rendererAgreement: DISAGREE,
				}),
			),
		).toBe('renderers disagree: MuseScore differs (straight stem)');
		expect(
			reason(
				agentCall({
					...base,
					status: 'new',
					checkState: 'active',
					rendererAgreement: null,
				}),
			),
		).toBe('no renderer agreement recorded under ### Renderers');
		expect(
			reason(
				agentCall({
					...base,
					status: 'new',
					checkState: 'active',
					subjective: 'Gould gives two choices',
				}),
			),
		).toBe('subjective: Gould gives two choices');
		expect(
			reason(agentCall({ ...base, status: 'new', checkState: 'none' })),
		).toStartWith('judged by eye');
		expect(
			reason(agentCall({ ...base, status: 'new', checkState: 'todo' })),
		).toStartWith('its check fails with no fix task');
		expect(
			reason(
				agentCall({
					...base,
					changedParts: ['note'],
					status: 'changed',
					checkState: 'active',
					verdict: verdict({ verdict: 'needs-decision' }),
				}),
			),
		).toBe('waits on a decision the user has open');
	});

	it('needs no call for settled or out-of-scope rules', () => {
		const base = {
			changedParts: [],
			subjective: null,
			rendererAgreement: UNANIMOUS,
			fixTask: null,
			verdict: null,
		};
		const statuses = ['approved', 'rejected', 'out-of-scope'] as const;
		expect(
			statuses.map((status) =>
				agentCall({ ...base, status, checkState: 'active' }),
			),
		).toEqual([null, null, null]);
	});

	it('carries forward a user approval when its own crop did not change', () => {
		const checks = [
			{
				n: 1,
				question: 'Does it look right?',
				verdict: 'approved' as const,
				note: 'Looks good.',
				treatment: 'vexml' as const,
			},
		];
		const userApproved = verdict({
			verdict: 'approved',
			by: 'user',
			note: 'Keep vexml as drawn.',
			treatment: 'vexml',
			checks,
		});
		const base = {
			status: 'changed' as const,
			changedParts: ['note', 'fixture'] as ('note' | 'fixture')[],
			fixTask: null,
			verdict: userApproved,
		};
		// Subjective, eye-judged, and disagreed rules all carry forward when screenshot is unchanged.
		expect(
			agentCall({
				...base,
				checkState: 'none',
				subjective: 'Gould allows both.',
				rendererAgreement: DISAGREE,
			}),
		).toEqual({
			verdict: 'approved',
			note: 'Keep vexml as drawn.',
			by: 'user',
			treatment: 'vexml',
			checks,
		});
		// Legacy user verdicts without `by` also carry forward as `by: 'user'`.
		expect(
			agentCall({
				...base,
				verdict: verdict({ verdict: 'approved', note: 'Approved earlier.' }),
				checkState: 'none',
				subjective: null,
				rendererAgreement: UNANIMOUS,
			}),
		).toEqual({
			verdict: 'approved',
			note: 'Approved earlier.',
			by: 'user',
		});
		// A genuinely changed crop still goes back to the user.
		expect(
			agentCall({
				...base,
				changedParts: ['screenshot'],
				checkState: 'none',
				subjective: 'Gould allows both.',
				rendererAgreement: UNANIMOUS,
			}),
		).toEqual({ reason: 'subjective: Gould allows both.' });
		expect(
			agentCall({
				...base,
				changedParts: ['screenshot'],
				checkState: 'none',
				subjective: null,
				rendererAgreement: UNANIMOUS,
			}),
		).toEqual({ reason: 'judged by eye: no measured check' });
		// A failing check does not carry forward an old approval.
		expect(
			agentCall({
				...base,
				checkState: 'failing',
				fixTask: 42,
				subjective: null,
				rendererAgreement: UNANIMOUS,
			}),
		).toMatchObject({ verdict: 'rejected', task: 42 });
	});

	it('settles a disagreed rule once its user-chosen treatment has a passing check', () => {
		const rejectedWithTreatment = verdict({
			verdict: 'rejected',
			by: 'user',
			treatment: 'musescore',
			task: 19,
			note: 'Match MuseScore.',
		});
		const base = {
			status: 'changed' as const,
			changedParts: ['screenshot', 'measurements'] as (
				| 'screenshot'
				| 'measurements'
			)[],
			subjective: null,
			rendererAgreement: DISAGREE,
			fixTask: null,
			verdict: rejectedWithTreatment,
		};
		expect(agentCall({ ...base, checkState: 'active' })).toEqual({
			verdict: 'approved',
			note: 'Its measured check passes.',
			treatment: 'musescore',
		});
		// Without a passing measured check, it still goes to the user.
		expect(agentCall({ ...base, checkState: 'todo', fixTask: 19 })).toEqual({
			reason: 'renderers disagree: MuseScore differs (straight stem)',
		});
		expect(agentCall({ ...base, checkState: 'none' })).toEqual({
			reason: 'renderers disagree: MuseScore differs (straight stem)',
		});
		// Without a recorded treatment, a disagreed rule with a changed crop still goes to the user.
		expect(
			agentCall({
				...base,
				verdict: verdict({ verdict: 'approved', by: 'user' }),
				checkState: 'active',
			}),
		).toEqual({
			reason: 'renderers disagree: MuseScore differs (straight stem)',
		});
	});

	it('reads the fix task above a check and the subjective reason in a note', () => {
		const source = [
			'\t// A beam slants.',
			'\t// fix: #3588',
			"\tit.todo('beam-slope-direction (p. 22): slants', async () => {});",
			'',
			"\tit.concurrent('beam-convex (p. 23): slopes', async () => {});",
		].join('\n');
		expect(fixTaskFor(source, 'beam-slope-direction')).toBe(3588);
		expect(fixTaskFor(source, 'beam-convex')).toBeNull();
		expect(fixTaskFor(source, 'beam-missing')).toBeNull();
		expect(
			subjectiveReason(
				'### The rule\n\nX.\n\n### Why a person decides\n\nGould allows both.\n\n### The test case\n\nY.',
			),
		).toBe('Gould allows both.');
		expect(subjectiveReason('### The rule\n\nX.')).toBeNull();
	});

	it('writes agent verdicts that the ledger reads as pass and fails', async () => {
		const fs = await workspace();
		const verdicts = new RuleVerdicts(fs);
		const now = new Date('2026-11-23T12:00:00.000Z');

		const preview = await verdicts.settle({ check: true, now });
		expect(preview.settled.map((r) => r.id)).toEqual([
			'rule-pass',
			'rule-todo',
		]);
		expect(await verdicts.readVerdict('rule-pass')).toBeNull();

		const result = await verdicts.settle({ now });
		expect(result.left).toEqual([
			{ id: 'rule-eye', reason: 'judged by eye: no measured check' },
			{ id: 'rule-taste', reason: 'subjective: Gould allows both.' },
			{
				id: 'rule-disagree',
				reason:
					'renderers disagree: MuseScore differs (straight stem); Verovio differs (straight stem)',
			},
			{
				id: 'rule-unrecorded',
				reason: 'no renderer agreement recorded under ### Renderers',
			},
		]);
		expect(await verdicts.readVerdict('rule-todo')).toMatchObject({
			verdict: 'rejected',
			task: 12,
			by: 'agent',
			date: '2026-11-23',
		});
		const derived = new Map(
			(await verdicts.statuses()).map((e) => [e.id, e.derivedLedgerStatus]),
		);
		expect(derived.get('rule-pass')).toBe('pass');
		expect(derived.get('rule-todo')).toBe('fails → #12');
		expect(derived.get('rule-eye')).toBe('pending');
		expect(derived.get('rule-disagree')).toBe('pending');
		expect(derived.get('rule-unrecorded')).toBe('pending');
		expect((await verdicts.settle({ now })).settled).toEqual([]);
	});

	it('refreshes carried-forward user approvals and settles treatment-chosen disagreements on disk', async () => {
		const fs = await workspace();
		const verdicts = new RuleVerdicts(fs);
		const now = new Date('2026-11-26T12:00:00.000Z');

		const initial = new Map(
			(await verdicts.statuses()).map((entry) => [entry.id, entry]),
		);
		const eyeEntry = initial.get('rule-eye');
		const tasteEntry = initial.get('rule-taste');
		const disagreeEntry = initial.get('rule-disagree');
		if (!eyeEntry || !tasteEntry || !disagreeEntry) {
			throw new Error('missing expected test entries');
		}

		// Record user approvals on eye-judged and subjective rules, and a user treatment on the disagreed rule.
		await verdicts.writeVerdict({
			id: 'rule-eye',
			fingerprint: eyeEntry.fingerprint,
			verdict: 'approved',
			date: '2026-11-20',
			reviewedAt: '2026-11-20T10:00:00.000Z',
			note: 'Approved by eye.',
			by: 'user',
			checks: [
				{
					n: 1,
					question: 'Does it look right?',
					verdict: 'approved',
					note: 'Yes.',
				},
			],
		});
		await verdicts.writeVerdict({
			id: 'rule-taste',
			fingerprint: tasteEntry.fingerprint,
			verdict: 'approved',
			date: '2026-11-20',
			reviewedAt: '2026-11-20T10:05:00.000Z',
			note: 'Approved subjective layout.',
			treatment: 'vexml',
			by: 'user',
		});
		await verdicts.writeVerdict({
			id: 'rule-disagree',
			fingerprint: disagreeEntry.fingerprint,
			verdict: 'rejected',
			date: '2026-11-20',
			reviewedAt: '2026-11-20T10:10:00.000Z',
			note: 'Follow MuseScore.',
			treatment: 'musescore',
			task: 19,
			by: 'user',
		});

		// Edit rule-eye's note (screenshot unchanged), make rule-disagree's check pass, and leave rule-taste's crop unchanged until later.
		await fs.write(
			`${RULE_NOTES_DIR}/rule-eye.md`,
			UNANIMOUS_NOTE.replace('X.', 'Clarified wording.'),
		);
		const updatedTests = (
			await fs.read(`${INTEGRATION_DIR}/engraving-checks.test.ts`)
		).replace(
			"it.todo('rule-disagree (p. 5): disagrees'",
			"it.concurrent('rule-disagree (p. 5): disagrees'",
		);
		await fs.write(`${INTEGRATION_DIR}/engraving-checks.test.ts`, updatedTests);

		const firstPass = await verdicts.settle({ now });
		expect(firstPass.settled.map((r) => r.id)).toEqual([
			'rule-pass',
			'rule-todo',
			'rule-eye',
			'rule-disagree',
		]);

		// rule-eye carried forward with refreshed fingerprint and preserved user metadata.
		const savedEye = await verdicts.readVerdict('rule-eye');
		expect(savedEye).toMatchObject({
			verdict: 'approved',
			by: 'user',
			date: '2026-11-20',
			reviewedAt: '2026-11-20T10:00:00.000Z',
			note: 'Approved by eye.',
			checks: [
				{
					n: 1,
					question: 'Does it look right?',
					verdict: 'approved',
					note: 'Yes.',
				},
			],
		});
		expect(savedEye?.fingerprint.note).not.toBe(eyeEntry.fingerprint.note);
		expect(savedEye?.fingerprint.screenshot).toBe(
			eyeEntry.fingerprint.screenshot,
		);

		// rule-disagree settled by agent while preserving the user's chosen treatment.
		const savedDisagree = await verdicts.readVerdict('rule-disagree');
		expect(savedDisagree).toMatchObject({
			verdict: 'approved',
			by: 'agent',
			treatment: 'musescore',
			date: '2026-11-26',
		});

		// Now change the screenshot bytes: user-approved eye-judged and subjective rules must go back to the user.
		await fs.writeBytes(
			`${SCREENSHOTS_DIR}/engraving_checks.png`,
			new Uint8Array([2]),
		);
		const afterPixelChange = await verdicts.settle({ check: true, now });
		expect(afterPixelChange.left).toEqual(
			expect.arrayContaining([
				{ id: 'rule-eye', reason: 'judged by eye: no measured check' },
				{ id: 'rule-taste', reason: 'subjective: Gould allows both.' },
			]),
		);
		// rule-disagree already has treatment + passing check, so it still settles.
		expect(afterPixelChange.settled.map((r) => r.id)).toContain(
			'rule-disagree',
		);
	});
});

const UNANIMOUS = {
	status: 'unanimous' as const,
	observations: [
		{
			renderer: 'behind-bars' as const,
			stance: 'agrees' as const,
			detail: null,
		},
		{ renderer: 'musescore' as const, stance: 'agrees' as const, detail: null },
	],
	highVariability: false,
	summary: null,
};

const CONSENSUS = {
	status: 'consensus' as const,
	observations: [
		{
			renderer: 'behind-bars' as const,
			stance: 'agrees' as const,
			detail: null,
		},
		{ renderer: 'musescore' as const, stance: 'agrees' as const, detail: null },
		{
			renderer: 'osmd' as const,
			stance: 'differs' as const,
			detail: 'overlaps',
		},
	],
	highVariability: false,
	summary: 'OSMD differs (overlaps)',
};

const DISAGREE = {
	status: 'disagree' as const,
	observations: [
		{
			renderer: 'behind-bars' as const,
			stance: 'agrees' as const,
			detail: 'diagonal branch',
		},
		{
			renderer: 'musescore' as const,
			stance: 'differs' as const,
			detail: 'straight stem',
		},
		{
			renderer: 'verovio' as const,
			stance: 'differs' as const,
			detail: 'straight stem',
		},
	],
	highVariability: true,
	summary: 'MuseScore differs (straight stem)',
};

function verdict(overrides: Partial<RuleVerdict>): RuleVerdict {
	return {
		id: 'rule',
		fingerprint: {
			note: null,
			fixture: null,
			screenshot: null,
			measurements: null,
		},
		verdict: 'approved',
		date: '2026-11-22',
		note: '',
		...overrides,
	};
}

const UNANIMOUS_NOTE = [
	'### The rule',
	'',
	'X.',
	'',
	'### Renderers',
	'',
	'- Behind Bars: agrees',
	'- MuseScore: agrees',
	'- Verovio: agrees',
	'- OSMD: agrees',
	'',
].join('\n');

async function workspace(): Promise<FakeFs> {
	const fs = new FakeFs();
	const rows = [
		'rule-pass',
		'rule-todo',
		'rule-eye',
		'rule-taste',
		'rule-disagree',
		'rule-unrecorded',
	].map(
		(id, i) =>
			`| ${id} | ${i + 1} | A rule. | pending | [checks](engraving-checks.test.ts) |`,
	);
	await fs.write(
		LEDGER_FILE,
		[
			'# Engraving',
			'',
			'| Id | Page | Rule | Status | Link |',
			'| --- | --- | --- | --- | --- |',
			...rows,
			'',
		].join('\n'),
	);
	await fs.write(
		`${INTEGRATION_DIR}/engraving-checks.test.ts`,
		`
import { describe, expect, it } from 'bun:test';
describe('checks', () => {
	it.concurrent('rule-pass (p. 1): passes', async () => {
		expect(await one()).toMatchMeasurements([1]);
	});
	// fix: #12
	it.todo('rule-todo (p. 2): fails', async () => {
		expect(await one()).toMatchMeasurements([2]);
	});
	it.concurrent('rule-taste (p. 4): measured', async () => {
		expect(await one()).toMatchMeasurements([4]);
	});
	// fix: #19
	it.todo('rule-disagree (p. 5): disagrees', async () => {
		expect(await one()).toMatchMeasurements([5]);
	});
	it.concurrent('rule-unrecorded (p. 6): unrecorded', async () => {
		expect(await one()).toMatchMeasurements([6]);
	});
});
async function one() { return [1]; }
`,
	);
	await fs.write(`${RULE_NOTES_DIR}/rule-pass.md`, UNANIMOUS_NOTE);
	await fs.write(`${RULE_NOTES_DIR}/rule-todo.md`, UNANIMOUS_NOTE);
	await fs.write(`${RULE_NOTES_DIR}/rule-eye.md`, UNANIMOUS_NOTE);
	await fs.write(
		`${RULE_NOTES_DIR}/rule-taste.md`,
		`${UNANIMOUS_NOTE}\n### Why a person decides\n\nGould allows both.\n`,
	);
	await fs.write(
		`${RULE_NOTES_DIR}/rule-disagree.md`,
		[
			'### The rule',
			'',
			'X.',
			'',
			'### Renderers',
			'',
			'- Behind Bars: agrees, diagonal branch',
			'- MuseScore: differs, straight stem',
			'- Verovio: differs, straight stem',
			'- OSMD: agrees',
			'',
		].join('\n'),
	);
	await fs.write(`${ENGRAVING_FIXTURES_DIR}/checks.musicxml`, '<score/>');
	await fs.writeBytes(
		`${SCREENSHOTS_DIR}/engraving_checks.png`,
		new Uint8Array([1]),
	);
	return fs;
}
