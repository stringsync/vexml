import * as path from 'node:path';
import type { Fs } from 'core/system';

/** Where a Behind Bars rule's note goes, as `<rule-id>.md`, for `vex review` to show beside its screenshot. */
export const RULE_NOTES_DIR = 'packages/integration/rules';

/** The ledger the rule ids come from. */
export const LEDGER_FILE = 'packages/integration/ENGRAVING.md';

/** The screenshot a rule's check records, which its note explains. */
export function ruleSnapshot(id: string): string {
	return `engraving_${id}.png`;
}

/** Every rule note, by the screenshot it explains (`engraving_<rule-id>.png`). */
export async function readRuleNotes(fs: Fs): Promise<Map<string, string>> {
	const notes = new Map<string, string>();
	let files: string[];
	try {
		files = await fs.readdir(RULE_NOTES_DIR);
	} catch {
		return notes;
	}
	for (const file of files.sort()) {
		if (!file.endsWith('.md')) {
			continue;
		}
		const text = (await fs.read(path.join(RULE_NOTES_DIR, file))).trim();
		if (text) {
			notes.set(ruleSnapshot(file.slice(0, -'.md'.length)), text);
		}
	}
	return notes;
}

/**
 * A snapshot's review note: its rule note, then what `--claims` says of it, so a claim
 * section holding only `### What was found` completes the rule's note, and any heading
 * the claim repeats replaces the note's.
 */
export function withRuleNote(
	claim: string | undefined,
	note: string | undefined,
): string | undefined {
	if (!note) {
		return claim;
	}
	return claim ? `${note}\n\n${claim}` : note;
}

/** The rule ids in the ledger's tables: the first cell of each row under an `| Id |` header. */
export function ledgerRuleIds(ledger: string): string[] {
	const ids: string[] = [];
	let inTable = false;
	for (const line of ledger.split('\n')) {
		const cells = line
			.split('|')
			.slice(1, -1)
			.map((cell) => cell.trim());
		if (!line.trim().startsWith('|')) {
			inTable = false;
		} else if (cells[0] === 'Id') {
			inTable = true;
		} else if (inTable && cells[0] && !/^-+$/.test(cells[0])) {
			ids.push(cells[0]);
		}
	}
	return ids;
}
