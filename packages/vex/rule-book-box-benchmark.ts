import { tmpdir } from 'node:os';
import * as path from 'node:path';
import type { Fs } from 'core/system';
import { DEFAULT_MAX_JEV_IMAGES } from './jev-budget';
import type { JevClient } from './jev-client';
import type { FractionalBox } from './jev-image';
import { type BookCropper, cropPng } from './rule-book';
import {
	BookBoxFinder,
	type BookBoxFlag,
	type BookBoxQuery,
	type BookBoxResult,
	DEFAULT_MIN_CONFIDENCE,
} from './rule-book-box';
import {
	type BookBoxComparisonEntry,
	renderBookBoxComparisonPng,
} from './rule-book-box-visual';
import { parseRuleChecks } from './rule-checks';
import { RULE_NOTES_DIR } from './rule-notes';

/** Default number of distinct Behind Bars pages evaluated by `--benchmark`. */
export const DEFAULT_BENCHMARK_PAGES = 10;

/** Default directory for benchmark comparison PNGs, always outside the repository. */
export function defaultBenchmarkDir(): string {
	return path.join(tmpdir(), 'vex-book-box-benchmark');
}

/** One committed `Book:` coordinate from `packages/integration/rules/*.md`. */
export interface CommittedBookExample {
	id: string;
	ruleId: string;
	checkN: number;
	page: string;
	description: string;
	expected: FractionalBox;
}

/** Spatial agreement metrics comparing one predicted box to a committed ground-truth box. */
export interface BoxOverlapMetrics {
	iou: number;
	/** Fraction of the committed box area covered by the predicted box. */
	recall: number;
	/** Fraction of the predicted box area falling inside the committed box. */
	precision: number;
	/** True when either box's centre sits inside the other box. */
	centerHit: boolean;
}

/** Per-check comparison result recorded in a benchmark report. */
export interface BookBoxBenchmarkItem {
	id: string;
	ruleId: string;
	checkN: number;
	page: string;
	description: string;
	expected: FractionalBox;
	actual: FractionalBox;
	bookLine: string;
	confidence: number;
	expectedStaffSpace: number | null;
	actualStaffSpace: number | null;
	flags: BookBoxFlag[];
	metrics: BoxOverlapMetrics;
}

/** Per-page summary and generated visual comparison PNG path in `/tmp`. */
export interface BookBoxBenchmarkPage {
	page: string;
	comparisonPng: string;
	items: BookBoxBenchmarkItem[];
}

/** Aggregate accuracy metrics across all benchmarked checks and distinct pages. */
export interface BookBoxBenchmarkSummary {
	pages: number;
	checks: number;
	meanIoU: number;
	medianIoU: number;
	iou50Count: number;
	iou30Count: number;
	overlapCount: number;
	meanRecall: number;
	meanPrecision: number;
	centerHitCount: number;
	expectedStaveCount: number;
	actualStaveCount: number;
	flaggedCount: number;
	uncachedImages: number;
	cacheHits: number;
	cacheMisses: number;
	maxImages: number;
}

/** Complete output of `runBookBoxBenchmark`. */
export interface BookBoxBenchmarkReport {
	outputDir: string;
	summary: BookBoxBenchmarkSummary;
	pages: BookBoxBenchmarkPage[];
}

/** Options for `runBookBoxBenchmark`. */
export interface BookBoxBenchmarkOptions {
	/** Number of distinct pages to sample when `pages` is omitted; defaults to 10. */
	pageCount?: number;
	/** Explicit print page labels to benchmark instead of stratified sampling. */
	pages?: readonly string[];
	/** Hard per-run cap on uncached images and benchmark page count; defaults to 25. */
	maxImages?: number;
	/** Confidence threshold below which boxes are flagged; defaults to 0.5. */
	minConfidence?: number;
	/** Output directory for visual comparison PNGs; defaults under OS temp directory. */
	outputDir?: string;
	/** Directory containing rule note markdown files; defaults to `packages/integration/rules`. */
	notesDir?: string;
	/** Disk cache directory for Jev responses. */
	cacheDir?: string;
	/** Set false to bypass disk caching while keeping `--max-images` enforced. */
	useCache?: boolean;
	cropper: BookCropper;
	client: JevClient;
	fs: Fs;
}

/** Computes Intersection-over-Union of two fractional rectangles in `0..1`. */
export function boxIoU(a: FractionalBox, b: FractionalBox): number {
	return boxOverlap(a, b).iou;
}

/** Computes IoU, recall, precision, and centre-hit agreement between expected and actual boxes. */
export function boxOverlap(
	expected: FractionalBox,
	actual: FractionalBox,
): BoxOverlapMetrics {
	const ax0 = expected.x;
	const ay0 = expected.y;
	const ax1 = expected.x + expected.w;
	const ay1 = expected.y + expected.h;
	const bx0 = actual.x;
	const by0 = actual.y;
	const bx1 = actual.x + actual.w;
	const by1 = actual.y + actual.h;
	const iw = Math.max(0, Math.min(ax1, bx1) - Math.max(ax0, bx0));
	const ih = Math.max(0, Math.min(ay1, by1) - Math.max(ay0, by0));
	const inter = iw * ih;
	const areaA = Math.max(0, expected.w) * Math.max(0, expected.h);
	const areaB = Math.max(0, actual.w) * Math.max(0, actual.h);
	const union = areaA + areaB - inter;
	const acx = ax0 + expected.w / 2;
	const acy = ay0 + expected.h / 2;
	const bcx = bx0 + actual.w / 2;
	const bcy = by0 + actual.h / 2;
	const bInA = bcx >= ax0 && bcx <= ax1 && bcy >= ay0 && bcy <= ay1;
	const aInB = acx >= bx0 && acx <= bx1 && acy >= by0 && acy <= by1;
	return {
		iou: union > 0 ? inter / union : 0,
		recall: areaA > 0 ? inter / areaA : 0,
		precision: areaB > 0 ? inter / areaB : 0,
		centerHit: bInA || aInB,
	};
}

/** Deterministically selects `count` distinct pages evenly stratified in ascending page order. */
export function selectBenchmarkPages(
	pages: readonly string[],
	count: number,
): string[] {
	const unique = [...new Set(pages.map((p) => p.trim().toLowerCase()))].sort(
		comparePages,
	);
	if (count <= 0 || unique.length === 0) {
		return [];
	}
	if (count >= unique.length) {
		return unique;
	}
	const picked: string[] = [];
	for (let i = 0; i < count; i++) {
		const idx = Math.floor(((i + 0.5) * unique.length) / count);
		const page = unique[idx];
		if (page !== undefined && !picked.includes(page)) {
			picked.push(page);
		}
	}
	return picked;
}

/** Extracts a concise musical description from a rule note's `### The rule` section and check question. */
export function extractRuleDescription(
	noteText: string,
	question: string,
): string {
	const lines = noteText.split('\n');
	const start = lines.findIndex((line) => line.trim() === '### The rule');
	const ruleParts: string[] = [];
	if (start >= 0) {
		for (const raw of lines.slice(start + 1)) {
			if (/^#{1,3}\s/.test(raw)) {
				break;
			}
			const trimmed = raw.trim();
			if (trimmed) {
				ruleParts.push(trimmed);
			}
		}
	}
	const rule = ruleParts
		.join(' ')
		.replace(/\s*See Behind Bars\b[^\n]*$/gi, '')
		.trim();
	const cleanQ = question
		.replace(/\s+in measures?\s+\d+(?:[\u2013-]\d+)?/gi, '')
		.trim();
	return rule ? `${rule} Specific example: ${cleanQ}` : cleanQ;
}

/** Reads every committed `Book:` coordinate from `packages/integration/rules/*.md`. */
export async function loadCommittedBookExamples(
	fs: Fs,
	notesDir = RULE_NOTES_DIR,
): Promise<CommittedBookExample[]> {
	let entries: string[];
	try {
		entries = await fs.readdir(notesDir);
	} catch {
		return [];
	}
	const files = entries.filter((name) => name.endsWith('.md')).sort();
	const examples: CommittedBookExample[] = [];
	for (const file of files) {
		const ruleId = file.replace(/\.md$/, '');
		const text = await fs.read(path.join(notesDir, file));
		for (const check of parseRuleChecks(text)) {
			if (!check.book) {
				continue;
			}
			examples.push({
				id: `${ruleId}#${check.n}`,
				ruleId,
				checkN: check.n,
				page: check.book.page.toLowerCase(),
				description: extractRuleDescription(text, check.question),
				expected: {
					x: check.book.x,
					y: check.book.y,
					w: check.book.w,
					h: check.book.h,
				},
			});
		}
	}
	return examples;
}

/**
 * Benchmarks `BookBoxFinder` against committed `Book:` boxes on `pageCount` distinct pages,
 * strictly bounded by `maxImages`, and writes visual comparison PNGs to `outputDir`.
 */
export async function runBookBoxBenchmark(
	opts: BookBoxBenchmarkOptions,
): Promise<BookBoxBenchmarkReport> {
	const maxImages = opts.maxImages ?? DEFAULT_MAX_JEV_IMAGES;
	const requestedCount = opts.pages
		? new Set(opts.pages.map((p) => p.trim().toLowerCase())).size
		: (opts.pageCount ?? DEFAULT_BENCHMARK_PAGES);
	if (!Number.isInteger(requestedCount) || requestedCount < 1) {
		throw new Error(
			`benchmark page count must be a positive integer, got ${requestedCount}`,
		);
	}
	if (requestedCount > maxImages) {
		throw new Error(
			`--benchmark ${requestedCount} exceeds --max-images ${maxImages}; lower --benchmark or raise --max-images`,
		);
	}

	const allExamples = await loadCommittedBookExamples(opts.fs, opts.notesDir);
	if (allExamples.length === 0) {
		throw new Error(
			`no committed Book: boxes found under ${opts.notesDir ?? RULE_NOTES_DIR}`,
		);
	}

	const byPage = new Map<string, CommittedBookExample[]>();
	for (const ex of allExamples) {
		const list = byPage.get(ex.page) ?? [];
		list.push(ex);
		byPage.set(ex.page, list);
	}

	const selectedPages = opts.pages
		? [...new Set(opts.pages.map((p) => p.trim().toLowerCase()))]
		: selectBenchmarkPages([...byPage.keys()], requestedCount);
	for (const page of selectedPages) {
		if (!byPage.has(page)) {
			throw new Error(
				`page ${JSON.stringify(page)} has no committed Book: boxes to benchmark`,
			);
		}
	}

	const selectedExamples: CommittedBookExample[] = [];
	for (const page of selectedPages) {
		selectedExamples.push(...(byPage.get(page) ?? []));
	}

	const finder = new BookBoxFinder(opts.cropper, opts.client, {
		maxImages,
		minConfidence: opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE,
		cacheDir: opts.cacheDir,
		useCache: opts.useCache,
		fs: opts.fs,
	});
	const queries: BookBoxQuery[] = selectedExamples.map((ex) => ({
		id: ex.id,
		page: ex.page,
		description: ex.description,
	}));
	const run = await finder.find(queries);

	const resultById = new Map<string, BookBoxResult>(
		run.results.map((r) => [r.id, r]),
	);
	const outputDir = opts.outputDir ?? defaultBenchmarkDir();
	await opts.fs.mkdir(outputDir, { recursive: true });

	const pageReports: BookBoxBenchmarkPage[] = [];
	const allItems: BookBoxBenchmarkItem[] = [];

	for (const page of selectedPages) {
		const pageData = await opts.cropper.readPage(page);
		if (!pageData) {
			throw new Error(`Behind Bars page ${JSON.stringify(page)} not found`);
		}
		const pageExamples = byPage.get(page) ?? [];
		const items: BookBoxBenchmarkItem[] = [];
		const visualEntries: BookBoxComparisonEntry[] = [];
		for (const [idx, ex] of pageExamples.entries()) {
			const res = resultById.get(ex.id);
			if (!res) {
				throw new Error(`missing benchmark result for ${ex.id}`);
			}
			const expectedCrop = cropPng(pageData.image, ex.expected);
			const item: BookBoxBenchmarkItem = {
				id: ex.id,
				ruleId: ex.ruleId,
				checkN: ex.checkN,
				page,
				description: ex.description,
				expected: ex.expected,
				actual: res.box,
				bookLine: res.bookLine,
				confidence: res.confidence,
				expectedStaffSpace: expectedCrop?.detectedSpace ?? null,
				actualStaffSpace: res.staffSpace,
				flags: res.flags,
				metrics: boxOverlap(ex.expected, res.box),
			};
			items.push(item);
			allItems.push(item);
			visualEntries.push({
				index: idx + 1,
				expected: ex.expected,
				actual: res.box,
			});
		}
		const comparisonPng = path.join(outputDir, `page-${page}.png`);
		const pngBytes = renderBookBoxComparisonPng(pageData.image, visualEntries);
		await opts.fs.writeBytes(comparisonPng, pngBytes);
		pageReports.push({ page, comparisonPng, items });
	}

	const ious = allItems.map((item) => item.metrics.iou).sort((a, b) => a - b);
	const count = allItems.length;
	return {
		outputDir,
		summary: {
			pages: selectedPages.length,
			checks: count,
			meanIoU: count > 0 ? mean(ious) : 0,
			medianIoU: count > 0 ? median(ious) : 0,
			iou50Count: allItems.filter((item) => item.metrics.iou >= 0.5).length,
			iou30Count: allItems.filter((item) => item.metrics.iou >= 0.3).length,
			overlapCount: allItems.filter((item) => item.metrics.iou > 0).length,
			meanRecall:
				count > 0 ? mean(allItems.map((item) => item.metrics.recall)) : 0,
			meanPrecision:
				count > 0 ? mean(allItems.map((item) => item.metrics.precision)) : 0,
			centerHitCount: allItems.filter((item) => item.metrics.centerHit).length,
			expectedStaveCount: allItems.filter(
				(item) => item.expectedStaffSpace !== null,
			).length,
			actualStaveCount: allItems.filter(
				(item) => item.actualStaffSpace !== null,
			).length,
			flaggedCount: allItems.filter((item) => item.flags.length > 0).length,
			uncachedImages: run.uncachedImages,
			cacheHits: run.cacheHits,
			cacheMisses: run.cacheMisses,
			maxImages: run.maxImages,
		},
		pages: pageReports,
	};
}

function comparePages(a: string, b: string): number {
	const na = Number(a);
	const nb = Number(b);
	if (Number.isFinite(na) && Number.isFinite(nb)) {
		return na - nb;
	}
	return a.localeCompare(b);
}

function mean(values: readonly number[]): number {
	return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function median(sorted: readonly number[]): number {
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 1) {
		return sorted[mid] ?? 0;
	}
	return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}
