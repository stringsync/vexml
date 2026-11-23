import { describe, expect, it } from 'bun:test';
import { FakeFs } from 'core/system/testing';
import {
	deriveLedgerStatus,
	parseLedgerRules,
	type RuleVerdict,
	updateLedgerStatuses,
} from './rule-ledger';
import { LEDGER_FILE, RULE_NOTES_DIR } from './rule-notes';
import {
	diffFingerprints,
	ENGRAVING_FIXTURES_DIR,
	INTEGRATION_DIR,
	MARKS_DIR,
	RuleVerdicts,
	SCREENSHOTS_DIR,
	VERDICTS_DIR,
} from './rule-verdicts';

describe('rule verdicts', () => {
	it('parses rule rows with sections, pages, and markdown links', () => {
		const rows = parseLedgerRules(LEDGER);
		expect(rows.map((r) => r.id)).toEqual(['stem-length', 'stave-lines']);
		expect(rows[0]).toMatchObject({
			id: 'stem-length',
			page: '14',
			pageNumber: 14,
			status: 'pass',
			linkLabel: 'stem-length',
			linkTarget: 'engraving-stem-length.test.ts',
			section: '5–37: Ground rules: stems, beams and rests (pilot)',
		});
		expect(rows[1]?.linkTarget).toBeNull();
	});

	it('derives ENGRAVING.md statuses from verdict and check state', () => {
		const base: RuleVerdict = {
			id: 'stem-length',
			fingerprint: {
				note: 'a',
				fixture: 'b',
				screenshot: 'c',
				measurements: 'd',
			},
			verdict: 'approved',
			date: '2026-11-23',
			note: '',
		};

		expect(
			deriveLedgerStatus({
				currentStatus: 'pass',
				reviewStatus: 'new',
				verdict: null,
				checkState: 'active',
			}),
		).toBe('pending');

		expect(
			deriveLedgerStatus({
				currentStatus: 'pass',
				reviewStatus: 'changed',
				verdict: base,
				checkState: 'active',
			}),
		).toBe('pending');

		expect(
			deriveLedgerStatus({
				currentStatus: 'pending',
				reviewStatus: 'approved',
				verdict: base,
				checkState: 'active',
			}),
		).toBe('pass');

		expect(
			deriveLedgerStatus({
				currentStatus: 'pending',
				reviewStatus: 'approved',
				verdict: base,
				checkState: 'none',
			}),
		).toBe('judged by eye');

		expect(
			deriveLedgerStatus({
				currentStatus: 'pending',
				reviewStatus: 'approved',
				verdict: base,
				checkState: 'failing',
			}),
		).toBe('fails');

		expect(
			deriveLedgerStatus({
				currentStatus: 'pending',
				reviewStatus: 'rejected',
				verdict: { ...base, verdict: 'rejected', task: 3581 },
				checkState: 'todo',
			}),
		).toBe('fails → #3581');

		expect(
			deriveLedgerStatus({
				currentStatus: 'pending',
				reviewStatus: 'rejected',
				verdict: { ...base, verdict: 'rejected' },
				checkState: 'active',
			}),
		).toBe('rejected');

		expect(
			deriveLedgerStatus({
				currentStatus: 'pending',
				reviewStatus: 'needs-decision',
				verdict: { ...base, verdict: 'needs-decision' },
				checkState: 'active',
			}),
		).toBe('needs decision');

		expect(
			deriveLedgerStatus({
				currentStatus: 'out of scope: terminology',
				reviewStatus: 'out-of-scope',
				verdict: null,
				checkState: 'none',
			}),
		).toBe('out of scope: terminology');
	});

	it('rewrites only the Status column for changed rows', () => {
		const updated = updateLedgerStatuses(
			LEDGER,
			new Map([
				['stem-length', 'pending'],
				['stave-lines', 'out of scope: terminology'],
			]),
		);
		expect(updated).toContain(
			'| stem-length | 14 | A stem is 3½ spaces. | pending | [stem-length](engraving-stem-length.test.ts) |',
		);
		expect(updated).toContain(
			'| stave-lines | 5 | Stave terms. | out of scope: terminology |  |',
		);
	});

	it('treats a missing verdict folder as nothing reviewed yet', async () => {
		const { verdicts } = await makeRuleWorkspace();
		const statuses = await verdicts.statuses();
		expect(statuses.map((s) => [s.id, s.status])).toEqual([
			['stem-length', 'new'],
			['stave-lines', 'out-of-scope'],
		]);
		const stem = statuses[0];
		expect(stem?.fingerprint.note).toHaveLength(64);
		expect(stem?.fingerprint.fixture).toHaveLength(64);
		expect(stem?.fingerprint.screenshot).toHaveLength(64);
		expect(stem?.fingerprint.measurements).toHaveLength(64);
	});

	it('records verdicts and reports approved, rejected, needs-decision, and exact changed parts', async () => {
		const { fs, verdicts } = await makeRuleWorkspace();
		const initial = await statusById(verdicts, 'stem-length');

		await verdicts.writeVerdict({
			id: 'stem-length',
			fingerprint: initial.fingerprint,
			verdict: 'approved',
			date: '2026-11-23',
			reviewedAt: '2026-11-23T15:00:00.000Z',
			note: 'looks right',
		});
		expect(await fs.exists(`${VERDICTS_DIR}/stem-length.json`)).toBe(true);
		const approved = await statusById(verdicts, 'stem-length');
		expect(approved.status).toBe('approved');
		expect(approved.verdict?.reviewedAt).toBe('2026-11-23T15:00:00.000Z');

		// Change note only
		await fs.write(
			`${RULE_NOTES_DIR}/stem-length.md`,
			`${NOTE}\nExtra detail.`,
		);
		let current = await statusById(verdicts, 'stem-length');
		expect(current.status).toBe('changed');
		expect(current.changedParts).toEqual(['note']);

		// Also change baseline screenshot bytes and fixture
		await fs.writeBytes(
			`${SCREENSHOTS_DIR}/engraving_stem-length.png`,
			new Uint8Array([137, 80, 78, 71, 9, 9, 9]),
		);
		await fs.write(
			`${ENGRAVING_FIXTURES_DIR}/stem-length.musicxml`,
			`${FIXTURE}\n<!-- edited -->`,
		);
		current = await statusById(verdicts, 'stem-length');
		expect(current.changedParts).toEqual(['note', 'fixture', 'screenshot']);

		// Re-record as rejected at the new fingerprint
		await verdicts.writeVerdict({
			id: 'stem-length',
			fingerprint: current.fingerprint,
			verdict: 'rejected',
			date: '2026-11-23',
			note: 'stems too short',
			task: 3581,
		});
		const rejected = await statusById(verdicts, 'stem-length');
		expect(rejected.status).toBe('rejected');
		expect(rejected.derivedLedgerStatus).toBe('fails → #3581');

		// Change measurements -> moves from rejected to changed (measurements)
		await fs.write(
			`${INTEGRATION_DIR}/engraving-stem-length.test.ts`,
			TEST_FILE.replace('[[3.5]]', '[[3.5, 3.5]]'),
		);
		const afterFix = await statusById(verdicts, 'stem-length');
		expect(afterFix.status).toBe('changed');
		expect(afterFix.changedParts).toEqual(['measurements']);
	});

	it('isolates sibling rules sharing one check file and tracks shared fixtures accurately', async () => {
		const fs = new FakeFs();
		const ledger = [
			'| Id | Page | Rule | Status | Link |',
			'| --- | --- | --- | --- | --- |',
			'| clef-c-centred | 6 | C clefs centre on their line. | pending | [clefs](engraving-clefs.test.ts) |',
			'| clef-percussion-centred | 6 | Percussion clefs centre. | pending | [clefs](engraving-clefs.test.ts) |',
			'| clef-g-f-on-line | 5 | G and F clefs sit on their lines. | pending | [clefs](engraving-clefs.test.ts) |',
		].join('\n');
		const testFile = `
describe('clefs', () => {
	it.concurrent('draws clefs', async () => {
		expect(await draw('clefs')).toMatchScreenshot('engraving_clefs.png');
	});
	it.concurrent('clef-c-centred (p. 6): c clefs', async () => {
		expect(await cClefs()).toEqual([0]);
	});
	it.concurrent('clef-percussion-centred (p. 6): percussion', async () => {
		expect(await percClefs()).toEqual([0]);
	});
});
async function cClefs() { const e = await engrave('clefs'); return [e.space()]; }
async function percClefs() { const e = await engrave('clef-percussion'); return [e.space()]; }
`;
		await fs.write(LEDGER_FILE, ledger);
		await fs.write(`${RULE_NOTES_DIR}/clef-c-centred.md`, 'C clef note');
		await fs.write(
			`${RULE_NOTES_DIR}/clef-percussion-centred.md`,
			'Percussion note',
		);
		await fs.write(`${RULE_NOTES_DIR}/clef-g-f-on-line.md`, 'G/F clef note');
		await fs.write(`${ENGRAVING_FIXTURES_DIR}/clefs.musicxml`, '<clefs/>');
		await fs.write(
			`${ENGRAVING_FIXTURES_DIR}/clef-percussion.musicxml`,
			'<perc/>',
		);
		await fs.writeBytes(
			`${SCREENSHOTS_DIR}/engraving_clefs.png`,
			new Uint8Array([1, 2]),
		);
		await fs.writeBytes(
			`${SCREENSHOTS_DIR}/engraving_clef-percussion.png`,
			new Uint8Array([3, 4]),
		);
		await fs.write(`${INTEGRATION_DIR}/engraving-clefs.test.ts`, testFile);

		const verdicts = new RuleVerdicts(fs);
		await approveAll(verdicts);

		// Eye-only rule has null measurements, resolves `clefs`, and derives `judged by eye`.
		const before = new Map((await verdicts.statuses()).map((e) => [e.id, e]));
		expect(before.get('clef-g-f-on-line')?.fingerprint.measurements).toBeNull();
		expect(before.get('clef-g-f-on-line')?.fixtureName).toBe('clefs');
		expect(before.get('clef-g-f-on-line')?.derivedLedgerStatus).toBe(
			'judged by eye',
		);
		expect(before.get('clef-percussion-centred')?.fixtureName).toBe(
			'clef-percussion',
		);

		// Editing clef-c-centred's check leaves clef-percussion-centred and clef-g-f-on-line approved.
		await fs.write(
			`${INTEGRATION_DIR}/engraving-clefs.test.ts`,
			testFile.replace('return [e.space()];', 'return [e.space() * 2];'),
		);
		const afterCheckEdit = new Map(
			(await verdicts.statuses()).map((e) => [e.id, e]),
		);
		expect(afterCheckEdit.get('clef-c-centred')?.status).toBe('changed');
		expect(afterCheckEdit.get('clef-c-centred')?.changedParts).toEqual([
			'measurements',
		]);
		expect(afterCheckEdit.get('clef-percussion-centred')?.status).toBe(
			'approved',
		);
		expect(afterCheckEdit.get('clef-g-f-on-line')?.status).toBe('approved');

		// Editing the shared `clefs` baseline screenshot affects both rules using `clefs`, not percussion.
		await fs.writeBytes(
			`${SCREENSHOTS_DIR}/engraving_clefs.png`,
			new Uint8Array([9, 9]),
		);
		const afterScreenshot = new Map(
			(await verdicts.statuses()).map((e) => [e.id, e]),
		);
		expect(afterScreenshot.get('clef-c-centred')?.changedParts).toEqual([
			'screenshot',
			'measurements',
		]);
		expect(afterScreenshot.get('clef-g-f-on-line')?.changedParts).toEqual([
			'screenshot',
		]);
		expect(afterScreenshot.get('clef-percussion-centred')?.status).toBe(
			'approved',
		);
	});

	it('downgrades an approved active check to fails when recorded marks report a failure', async () => {
		const { fs, verdicts } = await makeRuleWorkspace();
		const entry = await statusById(verdicts, 'stem-length');
		await verdicts.writeVerdict({
			id: 'stem-length',
			fingerprint: entry.fingerprint,
			verdict: 'approved',
			date: '2026-11-23',
			note: '',
		});
		await fs.write(
			`${MARKS_DIR}/engraving_stem-length.marks.json`,
			JSON.stringify({
				screenshot: 'engraving_stem-length.png',
				width: 100,
				height: 50,
				marks: [{ role: 'measure', pass: false }],
			}),
		);
		const after = (await verdicts.statuses())[0];
		expect(after?.checkState).toBe('failing');
		expect(after?.derivedLedgerStatus).toBe('fails');
	});

	it('syncs ENGRAVING.md Status cells and supports --check without writing', async () => {
		const { fs, verdicts } = await makeRuleWorkspace();
		const dry = await verdicts.syncLedger({ check: true });
		expect(dry.updated).toBe(false);
		expect(dry.changed).toEqual([
			{ id: 'stem-length', from: 'pass', to: 'pending' },
		]);
		expect(await fs.read(LEDGER_FILE)).toBe(LEDGER);

		const applied = await verdicts.syncLedger();
		expect(applied.updated).toBe(true);
		expect(await fs.read(LEDGER_FILE)).toContain(
			'| stem-length | 14 | A stem is 3½ spaces. | pending |',
		);
		expect(await fs.read(LEDGER_FILE)).toContain('out of scope: terminology');
	});

	it('rejects unsafe rule ids when reading or writing verdicts', async () => {
		const { verdicts } = await makeRuleWorkspace();
		await expect(verdicts.readVerdict('../escape')).rejects.toThrow(
			'invalid rule id',
		);
		expect(
			diffFingerprints(
				{ note: 'a', fixture: null, screenshot: 'c', measurements: 'd' },
				{ note: 'a', fixture: 'b', screenshot: 'c', measurements: null },
			),
		).toEqual(['fixture', 'measurements']);
	});
});

const LEDGER = [
	'# Engraving',
	'',
	'## 5–37: Ground rules: stems, beams and rests (pilot)',
	'',
	'| Id | Page | Rule | Status | Link |',
	'| --- | --- | --- | --- | --- |',
	'| stem-length | 14 | A stem is 3½ spaces. | pass | [stem-length](engraving-stem-length.test.ts) |',
	'| stave-lines | 5 | Stave terms. | out of scope: terminology |  |',
	'',
].join('\n');

const NOTE =
	'### The rule\n\nA stem is 3½ spaces.\n\n### The test case\n\nEight notes.\n\n### What to look for\n\nEvery stem reads 3½.\n';

const FIXTURE =
	'<score-partwise version="4.0"><part id="P1"/></score-partwise>';

const TEST_FILE = `
import { describe, expect, it } from 'bun:test';
import { draw, engrave } from './engraving-render';

describe('stem-length (Behind Bars p. 14)', () => {
	it.concurrent('draws stem-length', async () => {
		expect(await draw('stem-length')).toMatchScreenshot('engraving_stem-length.png');
	});
	it.concurrent('draws stems 3½ spaces long', async () => {
		expect(await stemLengths('stem-length')).toMatchMeasurements([[3.5]]);
	});
});

async function stemLengths(file: string) {
	const e = await engrave(file);
	return e.check([[3.5]]);
}
`;

async function makeRuleWorkspace(): Promise<{
	fs: FakeFs;
	verdicts: RuleVerdicts;
}> {
	const fs = new FakeFs();
	await fs.write(LEDGER_FILE, LEDGER);
	await fs.write(`${RULE_NOTES_DIR}/stem-length.md`, NOTE);
	await fs.write(`${ENGRAVING_FIXTURES_DIR}/stem-length.musicxml`, FIXTURE);
	await fs.writeBytes(
		`${SCREENSHOTS_DIR}/engraving_stem-length.png`,
		new Uint8Array([137, 80, 78, 71, 1, 2, 3]),
	);
	await fs.write(`${INTEGRATION_DIR}/engraving-stem-length.test.ts`, TEST_FILE);
	return { fs, verdicts: new RuleVerdicts(fs) };
}

async function statusById(
	verdicts: RuleVerdicts,
	id: string,
): Promise<Awaited<ReturnType<RuleVerdicts['statuses']>>[number]> {
	const found = (await verdicts.statuses()).find((entry) => entry.id === id);
	if (!found) {
		throw new Error(`missing status for ${id}`);
	}
	return found;
}

async function approveAll(verdicts: RuleVerdicts): Promise<void> {
	for (const entry of await verdicts.statuses()) {
		await verdicts.writeVerdict({
			id: entry.id,
			fingerprint: entry.fingerprint,
			verdict: 'approved',
			date: '2026-11-23',
			note: '',
		});
	}
}
