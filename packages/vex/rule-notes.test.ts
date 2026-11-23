import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { FakeFs } from 'core/system/testing';
import { PNG } from 'pngjs';
import { DIFFS_DIR, Diffs, parseSnapshotNotes } from './review';
import {
	LEDGER_FILE,
	ledgerRuleIds,
	RULE_NOTES_DIR,
	readRuleNotes,
	withRuleNote,
} from './rule-notes';

const NOTE =
	'### The rule\n\nStems run 3½.\n\n### The test case\n\nEight notes.\n\n### What to look for\n\nThe numbers.';

describe('rule notes', () => {
	it('reads each note by the screenshot it explains', async () => {
		const fs = new FakeFs();
		await fs.write(`${RULE_NOTES_DIR}/stem-length.md`, `${NOTE}\n`);
		await fs.write(`${RULE_NOTES_DIR}/README.txt`, 'not a note');
		const notes = await readRuleNotes(fs);
		expect([...notes.keys()]).toEqual(['engraving_stem-length.png']);
		expect(notes.get('engraving_stem-length.png')).toBe(NOTE);
	});

	it('reads no notes when the folder is missing', async () => {
		expect((await readRuleNotes(new FakeFs())).size).toBe(0);
	});

	it("completes a claim's found with the note's first three parts", () => {
		const { guide } = parseSnapshotNotes(
			withRuleNote('### What was found\n\nAll 3½: pass.', NOTE),
		);
		expect(guide?.rule).toContain('Stems run 3½.');
		expect(guide?.testCase).toContain('Eight notes.');
		expect(guide?.lookFor).toContain('The numbers.');
		expect(guide?.found).toContain('All 3½: pass.');
	});

	it('lets a claim replace a part the note has', () => {
		const { guide } = parseSnapshotNotes(
			withRuleNote('### The test case\n\nNine notes.', NOTE),
		);
		expect(guide?.testCase).toContain('Nine notes.');
		expect(guide?.testCase).not.toContain('Eight notes.');
	});

	it('shows a moved rule screenshot with its note, and adds no other', async () => {
		const fs = new FakeFs();
		await fs.mkdir(DIFFS_DIR);
		await fs.writeBytes(
			`${DIFFS_DIR}/engraving_stem-length.png`,
			PNG.sync.write(composite(10, 10)),
		);
		await fs.write(`${RULE_NOTES_DIR}/stem-length.md`, NOTE);
		await fs.write(`${RULE_NOTES_DIR}/beam-angle.md`, NOTE);
		const moved = await new Diffs(fs).collect('', {
			ruleNotes: await readRuleNotes(fs),
		});
		expect(moved.map((m) => m.entry.name)).toEqual([
			'engraving_stem-length.png',
		]);
		expect(moved[0]?.entry.guide?.rule).toContain('Stems run 3½.');
	});

	it("reads the rule ids from the ledger's tables", () => {
		const ledger = [
			'| Id | Page | Rule | Status | Link |',
			'| --- | --- | --- | --- | --- |',
			'| stem-length | 14 | Stems. | pass | x |',
			'',
			'| Kind | Meaning |',
			'| --- | --- |',
			'| pass | fine |',
			'',
			'| Id | Page | Rule | Status | Link |',
			'| --- | --- | --- | --- | --- |',
			'| beam-angle | 20 | Beams. | pending | x |',
		].join('\n');
		expect(ledgerRuleIds(ledger)).toEqual(['stem-length', 'beam-angle']);
	});

	it('has a note for every ledger rule, and a ledger row for every note', () => {
		const vexml = path.join(import.meta.dir, '../..');
		const ids = ledgerRuleIds(
			readFileSync(path.join(vexml, LEDGER_FILE), 'utf8'),
		).sort();
		const notes = readdirSync(path.join(vexml, RULE_NOTES_DIR))
			.filter((file) => file.endsWith('.md'))
			.map((file) => file.slice(0, -'.md'.length))
			.sort();
		expect(notes).toEqual(ids);
	});
});

/** A `vex test` diff: before, after and diff panels side by side under captions. */
function composite(width: number, height: number): PNG {
	const captions = 32;
	const png = new PNG({ width: width * 3, height: height + captions });
	png.data.fill(255);
	return png;
}
