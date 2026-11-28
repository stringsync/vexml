import * as path from 'node:path';
import { color, type Logger } from 'core/log';
import type { Fs, Ps } from 'core/system';
import { DEFAULT_MAX_JEV_IMAGES } from './jev-budget';
import type { JevClient } from './jev-client';
import { BookCropper, resolveBookDir } from './rule-book';
import {
	BookBoxFinder,
	type BookBoxQuery,
	type BookBoxResult,
	DEFAULT_MIN_CONFIDENCE,
} from './rule-book-box';
import {
	type BookBoxBenchmarkReport,
	DEFAULT_BENCHMARK_PAGES,
	defaultBenchmarkDir,
	extractRuleDescription,
	runBookBoxBenchmark,
} from './rule-book-box-benchmark';
import { renderBookBoxComparisonPng } from './rule-book-box-visual';
import { parseRuleChecks } from './rule-checks';
import { RULE_NOTES_DIR } from './rule-notes';
import { TypesafeJev } from './typesafe-jev';

/** Options for the opt-in `vex rules book-box` CLI command. */
export interface RulesBookBoxOptions {
	/** Print page label for direct `--query` lookup (e.g. `135`). */
	page?: string;
	/** One or more example descriptions to locate on `--page`. */
	queries?: readonly string[];
	/** One or more rule IDs whose checks should be located on their book pages. */
	rules?: readonly string[];
	/** Raw `--benchmark` flag value (`"true"` for default 10, or a positive integer string). */
	benchmark?: string;
	/** Optional comma-separated page labels for benchmark mode. */
	pages?: string;
	/** Hard per-run cap on uncached page images sent to Jev; defaults to 25. */
	maxImages?: number;
	/** Confidence threshold below which results are flagged `low-confidence`; defaults to 0.5. */
	minConfidence?: number;
	/** Set true to bypass disk caching while keeping `--max-images` enforced. */
	noCache?: boolean;
	/** Directory for visual comparison/overlay PNGs (benchmark defaults under `/tmp`). */
	output?: string;
	/** Print structured JSON instead of formatted terminal output. */
	json?: boolean;
	/** Optional injected `JevClient` for offline tests. */
	client?: JevClient;
	/** Optional override for the disk cache directory. */
	cacheDir?: string;
	/** Optional override for the rule notes directory. */
	notesDir?: string;
	cwd: string;
	fs: Fs;
	ps: Ps;
	log: Logger;
}

/** Parses `--benchmark` (`"true"` -> 10, positive integer string -> N, undefined -> null). */
export function parseBenchmarkCount(raw: string | undefined): number | null {
	if (raw === undefined) {
		return null;
	}
	if (raw === 'true') {
		return DEFAULT_BENCHMARK_PAGES;
	}
	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed < 1) {
		throw new Error(
			`--benchmark expects a positive integer, got ${JSON.stringify(raw)}`,
		);
	}
	return parsed;
}

/** Runs `vex rules book-box` in either direct lookup mode or `--benchmark` accuracy mode. */
export async function rulesBookBox(opts: RulesBookBoxOptions): Promise<void> {
	const benchmarkCount = parseBenchmarkCount(opts.benchmark);
	const explicitPages = opts.pages
		? opts.pages
				.split(',')
				.map((p) => p.trim())
				.filter(Boolean)
		: undefined;
	const isBenchmark =
		benchmarkCount !== null ||
		(explicitPages !== undefined && explicitPages.length > 0);
	const queries = opts.queries ?? [];
	const ruleIds = opts.rules ?? [];

	if (isBenchmark && (opts.page || queries.length > 0 || ruleIds.length > 0)) {
		throw new Error(
			'--benchmark cannot be combined with --page, --query, or --rule',
		);
	}
	if (!isBenchmark && queries.length === 0 && ruleIds.length === 0) {
		throw new Error(
			'pass --page <p> --query <description>, --rule <id>, or --benchmark [n]',
		);
	}
	if (queries.length > 0 && !opts.page) {
		throw new Error('--query requires --page <page>');
	}

	const client = opts.client ?? (await TypesafeJev.create());
	if (!(await client.available())) {
		throw new Error(
			'Jev is unavailable: set TYPESAFE_API_KEY via `splates creds set TYPESAFE_API_KEY`',
		);
	}

	const bookDir = resolveBookDir(opts.ps);
	const cropper = new BookCropper(opts.fs, bookDir);
	const maxImages = opts.maxImages ?? DEFAULT_MAX_JEV_IMAGES;
	const minConfidence = opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
	const outputDir = opts.output
		? path.resolve(opts.cwd, opts.output)
		: undefined;

	if (isBenchmark) {
		const report = await runBookBoxBenchmark({
			pageCount: benchmarkCount ?? DEFAULT_BENCHMARK_PAGES,
			pages: explicitPages,
			maxImages,
			minConfidence,
			outputDir: outputDir ?? defaultBenchmarkDir(),
			notesDir: opts.notesDir,
			cacheDir: opts.cacheDir,
			useCache: !opts.noCache,
			cropper,
			client,
			fs: opts.fs,
		});
		if (opts.json) {
			opts.log.info(JSON.stringify(report, null, 2));
			return;
		}
		logBenchmarkReport(report, opts.log);
		return;
	}

	const boxQueries: BookBoxQuery[] = [];
	if (opts.page) {
		for (const [i, description] of queries.entries()) {
			boxQueries.push({
				id: `q${i + 1}`,
				page: opts.page,
				description,
			});
		}
	}
	if (ruleIds.length > 0) {
		const notesDir = opts.notesDir ?? RULE_NOTES_DIR;
		for (const ruleId of ruleIds) {
			const notePath = path.join(notesDir, `${ruleId}.md`);
			if (!(await opts.fs.exists(notePath))) {
				throw new Error(`rule note not found: ${notePath}`);
			}
			const noteText = await opts.fs.read(notePath);
			const checks = parseRuleChecks(noteText);
			if (checks.length === 0) {
				throw new Error(`rule ${ruleId} declares no ### Checks`);
			}
			for (const check of checks) {
				const page = opts.page ?? check.book?.page;
				if (!page) {
					throw new Error(
						`rule ${ruleId}#${check.n} has no Book: page; pass --page <page>`,
					);
				}
				boxQueries.push({
					id: `${ruleId}#${check.n}`,
					page,
					description: extractRuleDescription(noteText, check.question),
				});
			}
		}
	}

	const finder = new BookBoxFinder(cropper, client, {
		maxImages,
		minConfidence,
		cacheDir: opts.cacheDir,
		useCache: !opts.noCache,
		fs: opts.fs,
	});
	const run = await finder.find(boxQueries);

	if (outputDir) {
		await opts.fs.mkdir(outputDir, { recursive: true });
		const byPage = new Map<string, BookBoxResult[]>();
		for (const result of run.results) {
			const list = byPage.get(result.page) ?? [];
			list.push(result);
			byPage.set(result.page, list);
		}
		for (const [page, items] of byPage) {
			const loaded = await cropper.readPage(page);
			if (!loaded) {
				continue;
			}
			const png = renderBookBoxComparisonPng(
				loaded.image,
				items.map((item, i) => ({ index: i + 1, actual: item.box })),
			);
			await opts.fs.writeBytes(path.join(outputDir, `page-${page}.png`), png);
		}
	}

	if (opts.json) {
		opts.log.info(JSON.stringify(run, null, 2));
		return;
	}
	for (const result of run.results) {
		const stave =
			result.staffSpace !== null
				? `stave ${result.staffSpace.toFixed(1)}px`
				: color.yellow('no stave');
		const flags =
			result.flags.length > 0
				? ` ${color.yellow(`[${result.flags.join(', ')}]`)}`
				: '';
		opts.log.info(
			`${result.id}  ${result.bookLine}  conf=${result.confidence.toFixed(2)}  ${stave}${flags}`,
		);
	}
	opts.log.info(
		`${run.results.length} box(es) across ${run.pages} page(s); uncached images: ${run.uncachedImages}/${run.maxImages} (cache hits: ${run.cacheHits}, misses: ${run.cacheMisses})`,
	);
}

function logBenchmarkReport(report: BookBoxBenchmarkReport, log: Logger): void {
	const { summary } = report;
	for (const page of report.pages) {
		for (const item of page.items) {
			const stave =
				item.actualStaffSpace !== null
					? `stave ${item.actualStaffSpace.toFixed(1)}px`
					: color.yellow('no stave');
			const flags =
				item.flags.length > 0
					? ` ${color.yellow(`[${item.flags.join(', ')}]`)}`
					: '';
			log.info(
				`p.${page.page.padEnd(4)} ${item.id.padEnd(36)} IoU=${item.metrics.iou.toFixed(3)} rec=${item.metrics.recall.toFixed(2)} prec=${item.metrics.precision.toFixed(2)} conf=${item.confidence.toFixed(2)} ${stave}${flags}`,
			);
		}
	}
	log.info(
		`pages=${summary.pages} checks=${summary.checks} meanIoU=${summary.meanIoU.toFixed(3)} medianIoU=${summary.medianIoU.toFixed(3)} IoU>=0.5=${summary.iou50Count}/${summary.checks} IoU>=0.3=${summary.iou30Count}/${summary.checks} centerHit=${summary.centerHitCount}/${summary.checks}`,
	);
	log.info(
		`stave detection: Jev ${summary.actualStaveCount}/${summary.checks} (${pct(summary.actualStaveCount, summary.checks)}), committed ${summary.expectedStaveCount}/${summary.checks} (${pct(summary.expectedStaveCount, summary.checks)}); flagged=${summary.flaggedCount}`,
	);
	log.info(
		`uncached images: ${summary.uncachedImages}/${summary.maxImages} (cache hits: ${summary.cacheHits}, misses: ${summary.cacheMisses}); comparisons in ${report.outputDir}`,
	);
}

function pct(part: number, total: number): string {
	return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '0.0%';
}
