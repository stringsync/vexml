import { color, type Logger } from 'core/log';
import type { Fs } from 'core/system';
import type { RuleReviewStatus, RuleTreatment } from './rule-ledger';
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
		opts.log.info('no rules in the engraving ledger');
		return;
	}

	const idWidth = Math.max(...ordered.map((entry) => entry.id.length));
	for (const entry of ordered) {
		opts.log.info(formatEntryLine(entry, idWidth));
	}
	opts.log.info(formatSummary(ordered));
}

/** Updates the ledger's Status cells and the index's Rules counts from verdicts and check results. */
export async function rulesSync(opts: RulesSyncOptions): Promise<void> {
	const result = await new RuleVerdicts(opts.fs).syncLedger({
		check: opts.check,
	});
	const drift = result.changed.length + result.counts.length;
	if (drift === 0) {
		opts.log.info('the engraving ledger is up to date');
		return;
	}
	for (const diff of result.changed) {
		opts.log.info(`${diff.id}: ${diff.from} -> ${diff.to}`);
	}
	for (const diff of result.counts) {
		opts.log.info(`${diff.file}: ${diff.from ?? '?'} -> ${diff.to} rules`);
	}
	if (opts.check) {
		throw new Error(
			`${drift} row(s) out of step in the engraving ledger: run \`vex rules sync\``,
		);
	}
	opts.log.info(`updated ${drift} row(s) in the engraving ledger`);
}

export interface RulesSettleOptions {
	check?: boolean;
	fs: Fs;
	log: Logger;
}

/** Records agent verdicts for the rules their measured checks decide, and lists what is left for the user. */
export async function rulesSettle(opts: RulesSettleOptions): Promise<void> {
	const { settled, left } = await new RuleVerdicts(opts.fs).settle({
		check: opts.check,
	});
	for (const rule of settled) {
		const badge =
			rule.verdict === 'approved'
				? color.green('approved'.padEnd(10))
				: color.red('rejected'.padEnd(10));
		const task = rule.task !== undefined ? ` #${rule.task}` : '';
		opts.log.info(`${badge}${rule.id}${task}`);
	}
	for (const rule of left) {
		opts.log.info(
			`${color.blue('for user'.padEnd(10))}${rule.id}: ${rule.reason}`,
		);
	}
	const verb = opts.check ? 'would settle' : 'settled';
	opts.log.info(
		`${verb} ${settled.length} rule(s); ${left.length} left for the user`,
	);
}

export interface RulesApproveOptions {
	ids: readonly string[];
	note?: string;
	treatment?: RuleTreatment;
	task?: number;
	fs: Fs;
	log: Logger;
}

/** Records user approval at the current fingerprint for one or more rules. */
export async function rulesApprove(opts: RulesApproveOptions): Promise<void> {
	const approved = await new RuleVerdicts(opts.fs).approve(opts.ids, {
		note: opts.note,
		treatment: opts.treatment,
		task: opts.task,
	});
	for (const rule of approved) {
		const parts = [rule.id];
		if (rule.treatment !== undefined) {
			parts.push(`[${rule.treatment}]`);
		}
		if (rule.task !== undefined) {
			parts.push(`#${rule.task}`);
		}
		opts.log.info(`${color.green('approved'.padEnd(10))}${parts.join(' ')}`);
	}
	opts.log.info(`approved ${approved.length} rule(s)`);
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
		const parts: string[] = entry.verdict?.by === 'agent' ? ['by agent'] : [];
		if (entry.verdict?.treatment) {
			parts.push(`[${entry.verdict.treatment}]`);
		}
		if (entry.verdict?.task !== undefined) {
			parts.push(`#${entry.verdict.task}`);
		}
		if (entry.verdict?.note) {
			parts.push(entry.verdict.note);
		}
		return parts.join(' ');
	}
	if (entry.status === 'approved') {
		const parts: string[] = [];
		if (entry.verdict?.by === 'agent') {
			parts.push('by agent');
		}
		if (entry.verdict?.treatment) {
			parts.push(`[${entry.verdict.treatment}]`);
		}
		return parts.join(' ');
	}
	if (entry.status === 'new') {
		if (entry.rendererAgreement?.status === 'disagree') {
			return entry.rendererAgreement.summary
				? `renderers disagree: ${entry.rendererAgreement.summary}`
				: 'renderers disagree';
		}
		if (entry.subjective !== null) {
			return 'subjective';
		}
		if (entry.rendererAgreement === null) {
			return 'no renderer agreement';
		}
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
