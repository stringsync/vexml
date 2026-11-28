import { color, type Logger } from 'core/log';
import type { Fs } from 'core/system';
import { DEFAULT_MAX_JEV_IMAGES } from './jev-budget';
import type { JevClient } from './jev-client';
import {
	DEFAULT_LOW_CONFIDENCE_THRESHOLD,
	DEFAULT_TRIAGE_SINCE,
	type TriageCheckItem,
	type TriagePriority,
	type TriageReport,
	triageRuleCrops,
} from './rule-triage';
import { TypesafeJev } from './typesafe-jev';

/** Options for the opt-in `vex rules triage` CLI command. */
export interface RulesTriageOptions {
	/** Base git ref to compare crops against; defaults to `main`. */
	since?: string;
	/** Optional rule IDs to restrict triage to; defaults to all rules. */
	rules?: readonly string[];
	/** Hard per-run cap on uncached images sent to Jev; defaults to 25. */
	maxImages?: number;
	/** Threshold below which non-regression checks surface as low-confidence; defaults to 0.7. */
	lowConfidenceThreshold?: number;
	/** Set true to bypass the disk cache while keeping `--max-images` enforced. */
	noCache?: boolean;
	/** Print structured JSON instead of the advisory table. */
	json?: boolean;
	/** Optional injected `JevClient` for offline tests. */
	client?: JevClient;
	/** Optional override for the disk cache directory. */
	cacheDir?: string;
	/** Optional override for the rule notes directory. */
	notesDir?: string;
	/** Swappable git reader for tests. */
	readAt?: (ref: string, repoPath: string) => Promise<Uint8Array | null>;
	fs: Fs;
	log: Logger;
}

/** Runs `vex rules triage` and prints an advisory triage report (never approves or merges). */
export async function rulesTriage(
	opts: RulesTriageOptions,
): Promise<TriageReport> {
	const client = opts.client ?? (await TypesafeJev.create());
	const report = await triageRuleCrops({
		since: opts.since ?? DEFAULT_TRIAGE_SINCE,
		rules: opts.rules,
		maxImages: opts.maxImages ?? DEFAULT_MAX_JEV_IMAGES,
		lowConfidenceThreshold:
			opts.lowConfidenceThreshold ?? DEFAULT_LOW_CONFIDENCE_THRESHOLD,
		useCache: !opts.noCache,
		cacheDir: opts.cacheDir,
		notesDir: opts.notesDir,
		client,
		readAt: opts.readAt,
		fs: opts.fs,
	});

	if (opts.json) {
		opts.log.info(JSON.stringify(report, null, 2));
		return report;
	}

	logTriageReport(report, opts.log);
	return report;
}

function logTriageReport(report: TriageReport, log: Logger): void {
	if (report.items.length === 0) {
		log.info(
			`no moved rule crops since ${report.since} (scanned ${report.scannedChecks} check(s) across ${report.scannedRules} rule(s); unchanged=${report.skippedUnchanged}, missingBefore=${report.skippedMissingBefore}, missingAfter=${report.skippedMissingAfter})`,
		);
		return;
	}

	const idWidth = Math.max(
		8,
		...report.items.map((item) => `${item.ruleId}#${item.checkN}`.length),
	);
	log.info(
		`${'PRIORITY'.padEnd(16)} ${'CHECK'.padEnd(idWidth)} ${'VERDICT'.padEnd(16)} ${'CONF'.padEnd(6)} ${'AFTER'.padEnd(6)} QUESTION`,
	);
	for (const item of report.items) {
		log.info(formatRow(item, idWidth));
	}
	log.info(
		`moved=${report.movedChecks} (regressions=${report.counts.regressions}, low-confidence=${report.counts.lowConfidence}, spacing-shifts=${report.counts.spacingShifts}, clearly-matches=${report.counts.clearlyMatches}); skipped unchanged=${report.skippedUnchanged}, missingBefore=${report.skippedMissingBefore}, missingAfter=${report.skippedMissingAfter}`,
	);
	log.info(
		`uncached images: ${report.uncachedImages}/${report.maxImages} (cache hits: ${report.cacheHits}, misses: ${report.cacheMisses}); advisory only: review with \`vex rules strip\` before approving`,
	);
}

function formatRow(item: TriageCheckItem, idWidth: number): string {
	const checkId = `${item.ruleId}#${item.checkN}`.padEnd(idWidth);
	const priority = colorPriority(item.priority);
	const verdict = item.verdict.padEnd(16);
	const conf = item.verdictConfidence.toFixed(2).padEnd(6);
	const after = item.checkScore.toFixed(2).padEnd(6);
	return `${priority} ${checkId} ${verdict} ${conf} ${after} ${item.question}`;
}

function colorPriority(priority: TriagePriority): string {
	const padded = priority.padEnd(16);
	if (priority === 'regression') {
		return color.red(padded);
	}
	if (priority === 'low-confidence') {
		return color.yellow(padded);
	}
	if (priority === 'spacing-shift') {
		return color.dim(padded);
	}
	return color.green(padded);
}
