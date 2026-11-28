import { describe, expect, it } from 'bun:test';
import { MemoryLogger } from 'core/log';
import { FakeFs } from 'core/system/testing';
import { LEDGER_FILE, RULE_NOTES_DIR } from './rule-notes';
import {
	ENGRAVING_FIXTURES_DIR,
	INTEGRATION_DIR,
	RuleVerdicts,
	SCREENSHOTS_DIR,
} from './rule-verdicts';
import {
	rulesApprove,
	rulesSettle,
	rulesStatus,
	rulesSync,
} from './rules-command';

describe('rules CLI commands', () => {
	it('lists statuses ordered by review priority and names changed parts', async () => {
		const { fs, log, verdicts } = await setup();
		await approveRule(verdicts, 'stem-length');
		await fs.write(`${RULE_NOTES_DIR}/stem-length.md`, 'Updated stem note');

		await rulesStatus({ fs, log });
		const output = log.entries.map((e) => String(e.message)).join('\n');
		expect(output).toContain('changed');
		expect(output).toContain('stem-length');
		expect(output).toContain('(note)');
		expect(output).toContain('clef-indent');
		expect(output).toContain(
			'3 rules: 1 new, 1 changed, 0 rejected, 0 needs-decision, 0 approved, 1 out-of-scope',
		);
	});

	it('prints structured JSON with --json', async () => {
		const { fs, log } = await setup();
		await rulesStatus({ json: true, fs, log });
		const raw = String(log.entries[0]?.message ?? '[]');
		const parsed = JSON.parse(raw) as { id: string; status: string }[];
		expect(parsed.map((p) => [p.id, p.status])).toEqual([
			['stem-length', 'new'],
			['clef-indent', 'new'],
			['stave-lines', 'out-of-scope'],
		]);
	});

	it('syncs ENGRAVING.md and fails under --check when out of step', async () => {
		const { fs, log } = await setup();
		await expect(rulesSync({ check: true, fs, log })).rejects.toThrow(
			'1 row(s) out of step',
		);

		const log2 = new MemoryLogger();
		await rulesSync({ fs, log: log2 });
		expect(await fs.read(LEDGER_FILE)).toContain(
			'| stem-length | 14 | Stems are 3½ spaces. | pending |',
		);

		const log3 = new MemoryLogger();
		await rulesSync({ check: true, fs, log: log3 });
		expect(log3.entries.map((e) => e.message)).toContain(
			'the engraving ledger is up to date',
		);
	});

	it('surfaces renderer disagreement in rulesStatus and rulesSettle', async () => {
		const { fs, log } = await setup();
		await fs.write(
			`${RULE_NOTES_DIR}/stem-length.md`,
			[
				'### The rule',
				'',
				'Stems are 3½ spaces.',
				'',
				'### Renderers',
				'',
				'- Behind Bars: agrees',
				'- MuseScore: differs, straight stem',
				'- Verovio: differs, straight stem',
				'- OSMD: agrees',
			].join('\n'),
		);

		await rulesStatus({ fs, log });
		const statusOut = log.entries.map((e) => String(e.message)).join('\n');
		expect(statusOut).toContain(
			'renderers disagree: MuseScore differs (straight stem); Verovio differs (straight stem)',
		);
		expect(statusOut).toContain('no renderer agreement');

		const settleLog = new MemoryLogger();
		await rulesSettle({ check: true, fs, log: settleLog });
		const settleOut = settleLog.entries
			.map((e) => String(e.message))
			.join('\n');
		expect(settleOut).toContain(
			'stem-length: renderers disagree: MuseScore differs (straight stem); Verovio differs (straight stem)',
		);
		expect(settleOut).toContain(
			'clef-indent: no renderer agreement recorded under ### Renderers',
		);
		expect(settleOut).toContain('would settle 0 rule(s); 2 left for the user');
	});

	it('approves rules at their current fingerprint, carrying forward treatment and task', async () => {
		const { fs, log, verdicts } = await setup();
		await fs.write(
			`${RULE_NOTES_DIR}/stem-length.md`,
			[
				'### The rule',
				'',
				'Stems are 3½ spaces.',
				'',
				'### Checks',
				'',
				'1. Are stems 3½ spaces long?',
				'   Crop: measure 1, 5 spaces',
			].join('\n'),
		);
		const before = (await verdicts.statuses()).find(
			(e) => e.id === 'stem-length',
		);
		if (!before) {
			throw new Error('missing stem-length');
		}
		await verdicts.writeVerdict({
			id: 'stem-length',
			fingerprint: before.fingerprint,
			verdict: 'rejected',
			date: '2026-11-25',
			note: 'Too short.',
			treatment: 'behind-bars',
			task: 4350,
			by: 'user',
		});

		await rulesApprove({ ids: ['stem-length'], fs, log });
		const saved = await verdicts.readVerdict('stem-length');
		expect(saved).not.toBeNull();
		expect(saved?.verdict).toBe('approved');
		expect(saved?.by).toBe('user');
		expect(saved?.treatment).toBe('behind-bars');
		expect(saved?.task).toBe(4350);
		expect(saved?.note).toBe('Approved on fix #4350 sign-off.');
		expect(saved?.fingerprint).toEqual(before.fingerprint);
		expect(saved?.checks).toEqual([
			{
				n: 1,
				question: 'Are stems 3½ spaces long?',
				verdict: 'approved',
				note: 'Approved on fix #4350 sign-off.',
				treatment: 'behind-bars',
			},
		]);

		const statusLog = new MemoryLogger();
		await rulesStatus({ fs, log: statusLog });
		const statusOut = statusLog.entries
			.map((e) => String(e.message))
			.join('\n');
		expect(statusOut).toContain('approved');
		expect(statusOut).toContain('[behind-bars]');
		expect(statusOut).not.toContain('by agent');

		const syncLog = new MemoryLogger();
		await rulesSync({ fs, log: syncLog });
		expect(await fs.read(LEDGER_FILE)).toContain(
			'| stem-length | 14 | Stems are 3½ spaces. | pass |',
		);
	});

	it('allows overriding note, treatment, and task and rejects unknown or empty ids', async () => {
		const { fs, log, verdicts } = await setup();
		await expect(rulesApprove({ ids: [], fs, log })).rejects.toThrow(
			'pass at least one rule id to approve',
		);
		await expect(
			rulesApprove({ ids: ['stem-length', 'no-such-rule'], fs, log }),
		).rejects.toThrow('unknown rule id(s): no-such-rule');
		expect(await verdicts.readVerdict('stem-length')).toBeNull();

		await rulesApprove({
			ids: ['stem-length', 'clef-indent'],
			note: 'Approved after sign-off.',
			treatment: 'musescore',
			task: 4401,
			fs,
			log,
		});
		const stem = await verdicts.readVerdict('stem-length');
		const clef = await verdicts.readVerdict('clef-indent');
		expect(stem?.note).toBe('Approved after sign-off.');
		expect(stem?.treatment).toBe('musescore');
		expect(stem?.task).toBe(4401);
		expect(clef?.verdict).toBe('approved');
		expect(clef?.by).toBe('user');
	});
});

const LEDGER = [
	'| Id | Page | Rule | Status | Link |',
	'| --- | --- | --- | --- | --- |',
	'| stem-length | 14 | Stems are 3½ spaces. | pass | [stem-length](engraving-stem-length.test.ts) |',
	'| clef-indent | 6 | Opening clef indents. | pending | [clefs](engraving-clefs.test.ts) |',
	'| stave-lines | 5 | Terminology. | out of scope: terminology |  |',
].join('\n');

async function setup() {
	const fs = new FakeFs();
	const log = new MemoryLogger();
	await fs.write(LEDGER_FILE, LEDGER);
	await fs.write(`${RULE_NOTES_DIR}/stem-length.md`, 'Stem note');
	await fs.write(`${RULE_NOTES_DIR}/clef-indent.md`, 'Clef note');
	await fs.write(`${ENGRAVING_FIXTURES_DIR}/stem-length.musicxml`, '<s/>');
	await fs.write(`${ENGRAVING_FIXTURES_DIR}/clefs.musicxml`, '<c/>');
	await fs.writeBytes(
		`${SCREENSHOTS_DIR}/engraving_stem-length.png`,
		new Uint8Array([1, 2, 3]),
	);
	await fs.writeBytes(
		`${SCREENSHOTS_DIR}/engraving_clefs.png`,
		new Uint8Array([4, 5, 6]),
	);
	await fs.write(
		`${INTEGRATION_DIR}/engraving-stem-length.test.ts`,
		`describe('stem-length', () => { it('checks', () => { expect(1).toBe(1); }); });`,
	);
	await fs.write(
		`${INTEGRATION_DIR}/engraving-clefs.test.ts`,
		`it('clef-indent (p. 6)', async () => { await engrave('clefs'); expect(1).toBe(1); });`,
	);
	return { fs, log, verdicts: new RuleVerdicts(fs) };
}

async function approveRule(verdicts: RuleVerdicts, id: string): Promise<void> {
	const entry = (await verdicts.statuses()).find((e) => e.id === id);
	if (!entry) {
		throw new Error(`missing ${id}`);
	}
	await verdicts.writeVerdict({
		id,
		fingerprint: entry.fingerprint,
		verdict: 'approved',
		date: '2026-11-23',
		note: '',
	});
}
