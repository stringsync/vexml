import { color, type Logger } from 'core/log';
import type { Fs } from 'core/system';
import type { RuleReviewStatus } from './rule-ledger';
import { type RuleStatusEntry, RuleVerdicts } from './rule-verdicts';

export interface RulesStatusOptions {
	json?: boolean;
	fs: Fs;
	log: Logger;
}

export interface RulesSyncOptions {
	check?: boolean;
	fs: Fs;
	log: Logger;
}

/** Lists every Behind Bars rule as new, changed, rejected, needs-decision, approved, or out of scope. */
export async function rulesStatus(opts: RulesStatusOptions): Promise<void> {
	const entries = await new RuleVerdicts(opts.fs).statuses();
	if (opts.json) {
		opts.log.info(JSON.stringify(entries, null, 2));
		return;
	}

	const ordered = [...entries].sort(
		(a, b) =>
			STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
			a.pageNumber - b.pageNumber ||
			a.id.localeCompare(b.id),
	);

	if (ordered.length === 0) {
		opts.log.info('no rules in ENGRAVING.md');
		return;
	}

	const idWidth = Math.max(...ordered.map((entry) => entry.id.length));
	for (const entry of ordered) {
		opts.log.info(formatEntryLine(entry, idWidth));
	}
	opts.log.info(formatSummary(ordered));
}

/** Updates the Status column of `ENGRAVING.md` from verdicts and check results. */
export async function rulesSync(opts: RulesSyncOptions): Promise<void> {
	const result = await new RuleVerdicts(opts.fs).syncLedger({
		check: opts.check,
	});
	if (result.changed.length === 0) {
		opts.log.info('ENGRAVING.md is up to date');
		return;
	}
	for (const diff of result.changed) {
		opts.log.info(`${diff.id}: ${diff.from} -> ${diff.to}`);
	}
	if (opts.check) {
		throw new Error(
			`${result.changed.length} rule row(s) out of step in ENGRAVING.md: run \`vex rules sync\``,
		);
	}
	opts.log.info(`updated ${result.changed.length} row(s) in ENGRAVING.md`);
}

const STATUS_ORDER: Record<RuleReviewStatus, number> = {
	changed: 0,
	rejected: 1,
	'needs-decision': 2,
	new: 3,
	approved: 4,
	'out-of-scope': 5,
};

function formatEntryLine(entry: RuleStatusEntry, idWidth: number): string {
	const badge = formatBadge(entry.status);
	const page = entry.page ? color.dim(`p. ${entry.page}`) : '';
	const detail = formatDetail(entry);
	const cols = [badge, entry.id.padEnd(idWidth), page, detail].filter(Boolean);
	return cols.join('  ');
}

function formatBadge(status: RuleReviewStatus): string {
	const label = status.padEnd(14);
	switch (status) {
		case 'changed':
			return color.yellow(label);
		case 'rejected':
			return color.red(label);
		case 'needs-decision':
			return color.magenta(label);
		case 'new':
			return color.blue(label);
		case 'approved':
			return color.green(label);
		case 'out-of-scope':
			return color.dim(label);
	}
}

function formatDetail(entry: RuleStatusEntry): string {
	if (entry.status === 'changed') {
		const moved = `(${entry.changedParts.join(', ')})`;
		const prior =
			entry.verdict && entry.verdict.verdict !== 'approved'
				? ` was ${entry.verdict.verdict}`
				: '';
		return `${moved}${prior}`;
	}
	if (entry.status === 'rejected' || entry.status === 'needs-decision') {
		const parts: string[] = [];
		if (entry.verdict?.task !== undefined) {
			parts.push(`#${entry.verdict.task}`);
		}
		if (entry.verdict?.note) {
			parts.push(entry.verdict.note);
		}
		return parts.join(' ');
	}
	return '';
}

function formatSummary(entries: readonly RuleStatusEntry[]): string {
	const count = (status: RuleReviewStatus) =>
		entries.filter((entry) => entry.status === status).length;
	const parts = [
		`${count('new')} new`,
		`${count('changed')} changed`,
		`${count('rejected')} rejected`,
		`${count('needs-decision')} needs-decision`,
		`${count('approved')} approved`,
	];
	const outOfScope = count('out-of-scope');
	if (outOfScope > 0) {
		parts.push(`${outOfScope} out-of-scope`);
	}
	const noun = entries.length === 1 ? 'rule' : 'rules';
	return `${entries.length} ${noun}: ${parts.join(', ')}`;
}
