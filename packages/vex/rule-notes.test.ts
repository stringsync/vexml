import { describe, expect, it } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { FakeFs } from 'core/system/testing';
import { isOutOfScopeStatus, readLedger } from './rule-ledger';
import {
	LEDGER_FILE,
	parseRendererAgreement,
	RULE_NOTES_DIR,
} from './rule-notes';

describe('rule notes', () => {
	it('reads the rule rows of every section file the index links', async () => {
		const fs = new FakeFs();
		await fs.write(
			LEDGER_FILE,
			[
				'| Kind | Meaning |',
				'| --- | --- |',
				'| pass | fine |',
				'',
				'| Pages | Section | Status | Rules |',
				'| --- | --- | --- | --- |',
				'| 5–37 | [Ground rules](ledger/005-ground.md) | pending | 1 |',
				'| 38–59 | Barlines | pending | 0 |',
				'| 60–89 | [Ties](ledger/060-ties.md) | pending | 1 |',
			].join('\n'),
		);
		const table = (row: string) =>
			[
				'| Id | Page | Rule | Status | Link |',
				'| --- | --- | --- | --- | --- |',
				row,
			].join('\n');
		await fs.write(
			'packages/integration/ledger/005-ground.md',
			`# 5–37: Ground rules\n\n${table('| stem-length | 14 | Stems. | pass | [stem-length](../engraving-stem-length.test.ts) |')}`,
		);
		await fs.write(
			'packages/integration/ledger/060-ties.md',
			table('| tie-arc | 60 | Ties. | pending |  |'),
		);
		const files = await readLedger(fs);
		const rows = files.flatMap((f) => f.rows);
		expect(rows.map((r) => r.id)).toEqual(['stem-length', 'tie-arc']);
		expect(rows[0]).toMatchObject({
			section: '5–37: Ground rules',
			linkTarget: 'engraving-stem-length.test.ts',
		});
	});

	it('fails when the index links a section file that is missing', async () => {
		const fs = new FakeFs();
		await fs.write(
			LEDGER_FILE,
			'| Pages | Section | Status | Rules |\n| --- | --- | --- | --- |\n| 5 | [Gone](ledger/gone.md) | pending | 0 |',
		);
		await expect(readLedger(fs)).rejects.toThrow('ledger/gone.md');
	});

	it('has a note for every in-scope ledger rule, and a ledger row for every note', async () => {
		const vexml = path.join(import.meta.dir, '../..');
		const files = await readLedger({
			exists: async (file) => existsSync(path.join(vexml, file)),
			read: async (file) => readFileSync(path.join(vexml, file), 'utf8'),
		});
		const ids = files
			.flatMap((f) => f.rows)
			.filter((r) => !isOutOfScopeStatus(r.status))
			.map((r) => r.id)
			.sort();
		const notes = readdirSync(path.join(vexml, RULE_NOTES_DIR))
			.filter((file) => file.endsWith('.md'))
			.map((file) => file.slice(0, -'.md'.length))
			.sort();
		expect(notes).toEqual(ids);
	});

	it('parses unanimous, consensus, and disagreeing renderer agreement under ### Renderers', () => {
		expect(
			parseRendererAgreement('### The rule\n\nStems run 3½.\n'),
		).toBeNull();

		const unanimous = parseRendererAgreement(
			[
				'### The rule',
				'',
				'Stems run 3½.',
				'',
				'### Renderers',
				'',
				'- Behind Bars: agrees, 3½ spaces',
				'- MuseScore: matches',
				'- Verovio: agrees',
				'- OSMD: unavailable, fixture unsupported',
			].join('\n'),
		);
		expect(unanimous).toMatchObject({
			status: 'unanimous',
			highVariability: false,
			summary: null,
		});
		expect(unanimous?.observations).toHaveLength(4);

		const bookAndMuseScore = parseRendererAgreement(
			[
				'### Renderers',
				'',
				'- Behind Bars: agrees',
				'- MuseScore: agrees',
				'- Verovio: differs, tighter gap',
				'- OSMD: differs, overlaps',
			].join('\n'),
		);
		expect(bookAndMuseScore).toMatchObject({
			status: 'consensus',
			highVariability: true,
			summary: 'Verovio differs (tighter gap); OSMD differs (overlaps)',
		});

		const bookAndTwoDigital = parseRendererAgreement(
			[
				'### Renderers',
				'',
				'- Behind Bars: agrees',
				'- MuseScore: differs, straight stem',
				'- Verovio: agrees',
				'- OSMD: agrees',
			].join('\n'),
		);
		expect(bookAndTwoDigital).toMatchObject({
			status: 'consensus',
			highVariability: false,
			summary: 'MuseScore differs (straight stem)',
		});

		const disagreed = parseRendererAgreement(
			[
				'### Renderers',
				'',
				'- Behind Bars: agrees, diagonal branch',
				'- MuseScore: differs, uses straight stem',
				'- Verovio: differs, uses straight stem',
				'- OSMD: disagrees, overlaps accidental',
			].join('\n'),
		);
		expect(disagreed).toMatchObject({
			status: 'disagree',
			highVariability: true,
			summary:
				'MuseScore differs (uses straight stem); Verovio differs (uses straight stem); OSMD differs (overlaps accidental)',
		});

		const singleAvailable = parseRendererAgreement(
			[
				'### Renderers',
				'',
				'- Behind Bars: agrees',
				'- MuseScore: unavailable',
				'- Verovio: n/a',
				'- OSMD: unavailable',
			].join('\n'),
		);
		expect(singleAvailable).toMatchObject({
			status: 'disagree',
			highVariability: false,
			summary: 'only Behind Bars available',
		});
	});

	it('rejects unknown renderers and malformed entries under ### Renderers', () => {
		expect(() =>
			parseRendererAgreement('### Renderers\n\n- LilyPond: agrees\n'),
		).toThrow('unknown renderer');
		expect(() =>
			parseRendererAgreement('### Renderers\n\n- MuseScore: maybe\n'),
		).toThrow('cannot read stance');
	});
});
