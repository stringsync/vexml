import * as path from 'node:path';
import type { Fs } from 'core/system';
import { PNG } from 'pngjs';
import { GuardedJev } from './guarded-jev';
import { DEFAULT_MAX_JEV_IMAGES } from './jev-budget';
import type {
	JevChoiceQuestion,
	JevClient,
	JevNoulQuestion,
	JevQueryRequest,
} from './jev-client';
import { prepareJevImage } from './jev-image';
import { parseRuleChecks } from './rule-checks';
import { RULE_NOTES_DIR } from './rule-notes';
import {
	cropCheckPng,
	type LoadedRender,
	loadRuleRenderPair,
} from './rule-strip';
import { RuleVerdicts } from './rule-verdicts';

/** Base git ref used when `--since` is omitted. */
export const DEFAULT_TRIAGE_SINCE = 'main';

/** Confidence/check floor below which a non-regression item is elevated as low-confidence. */
export const DEFAULT_LOW_CONFIDENCE_THRESHOLD = 0.7;

/** Classification choices returned by Jev for a moved Before/After crop. */
export const TRIAGE_VERDICTS = [
	'clearly_matches',
	'spacing_shift',
	'regression',
] as const;

/**
 * Inspects Behind Bars rule checks against `since`, skips unchanged crops locally, and sends
 * one labeled Before/After image per moved check to Jev (cached and budget-capped) with two
 * batched questions: the check question (`noul`) and a change verdict (`choice`).
 */
export async function triageRuleCrops(
	opts: RuleTriageOptions,
): Promise<TriageReport> {
	const since = opts.since ?? DEFAULT_TRIAGE_SINCE;
	const maxImages = opts.maxImages ?? DEFAULT_MAX_JEV_IMAGES;
	const lowConfidenceThreshold =
		opts.lowConfidenceThreshold ?? DEFAULT_LOW_CONFIDENCE_THRESHOLD;
	const notesDir = opts.notesDir ?? RULE_NOTES_DIR;

	const verdicts = new RuleVerdicts(opts.fs);
	const allRows = await verdicts.readRules();
	const rows = selectRuleRows(allRows, opts.rules);

	const renderCache = new Map<
		string,
		{ before: LoadedRender | null; after: LoadedRender | null }
	>();
	const candidates: MovedCheckCandidate[] = [];
	let scannedChecks = 0;
	let skippedUnchanged = 0;
	let skippedMissingBefore = 0;
	let skippedMissingAfter = 0;

	for (const row of rows) {
		const notePath = path.join(notesDir, `${row.id}.md`);
		if (!(await opts.fs.exists(notePath))) {
			continue;
		}
		const note = await opts.fs.read(notePath);
		const checks = parseRuleChecks(note);
		if (checks.length === 0) {
			continue;
		}
		const { fixtureName } = await verdicts.fingerprint(row);
		let pair = renderCache.get(fixtureName);
		if (!pair) {
			pair = await loadRuleRenderPair({
				fixtureName,
				since,
				readAt: opts.readAt,
				fs: opts.fs,
			});
			renderCache.set(fixtureName, pair);
		}

		for (const check of checks) {
			scannedChecks += 1;
			const afterCrop = pair.after ? cropCheckPng(pair.after, check) : null;
			if (!afterCrop) {
				skippedMissingAfter += 1;
				continue;
			}
			const beforeCrop = pair.before ? cropCheckPng(pair.before, check) : null;
			if (!beforeCrop) {
				skippedMissingBefore += 1;
				continue;
			}
			const diff = diffCropPixels(beforeCrop.png, afterCrop.png);
			if (!diff.changed) {
				skippedUnchanged += 1;
				continue;
			}
			const composed = composeBeforeAfterPng(beforeCrop.png, afterCrop.png);
			candidates.push({
				ruleId: row.id,
				checkN: check.n,
				page: row.page,
				rule: row.rule,
				fixtureName,
				question: check.question,
				diff,
				beforeSize: {
					width: beforeCrop.png.width,
					height: beforeCrop.png.height,
				},
				afterSize: {
					width: afterCrop.png.width,
					height: afterCrop.png.height,
				},
				request: buildTriageRequest(row.rule, check.question, composed),
			});
		}
	}

	if (candidates.length === 0) {
		return {
			since,
			scannedRules: rows.length,
			scannedChecks,
			movedChecks: 0,
			skippedUnchanged,
			skippedMissingBefore,
			skippedMissingAfter,
			uncachedImages: 0,
			maxImages,
			cacheHits: 0,
			cacheMisses: 0,
			counts: {
				regressions: 0,
				lowConfidence: 0,
				spacingShifts: 0,
				clearlyMatches: 0,
			},
			items: [],
		};
	}

	const guarded = new GuardedJev(opts.client, {
		maxImages,
		cacheDir: opts.cacheDir,
		useCache: opts.useCache,
		fs: opts.fs,
	});
	const requests = candidates.map((candidate) => candidate.request);
	const plan = await guarded.preflight(requests);
	if (plan.uncachedRequests > 0 && !(await guarded.available())) {
		throw new Error(
			'Jev is unavailable: set TYPESAFE_API_KEY via `splates creds set TYPESAFE_API_KEY`',
		);
	}

	const answers = await guarded.queryBatch(requests);
	const items = candidates.map((candidate, index): TriageCheckItem => {
		const answer = answers[index];
		if (!answer) {
			throw new Error(
				`missing Jev answer for ${candidate.ruleId}#${candidate.checkN}`,
			);
		}
		const verdict = answer.verdict.choice as TriageVerdict;
		const verdictConfidence = answer.verdict.confidence;
		const checkScore = answer.check.noul;
		const lowConfidence =
			verdict !== 'regression' &&
			(verdictConfidence < lowConfidenceThreshold ||
				checkScore < lowConfidenceThreshold);
		const priority = classifyPriority(verdict, lowConfidence);
		return {
			ruleId: candidate.ruleId,
			checkN: candidate.checkN,
			page: candidate.page,
			rule: candidate.rule,
			fixtureName: candidate.fixtureName,
			question: candidate.question,
			verdict,
			verdictConfidence,
			verdictProbabilities: answer.verdict.probabilities,
			checkScore,
			lowConfidence,
			priority,
			movedPixels: candidate.diff.movedPixels,
			totalPixels: candidate.diff.totalPixels,
			beforeSize: candidate.beforeSize,
			afterSize: candidate.afterSize,
		};
	});

	const sorted = sortTriageItems(items);
	return {
		since,
		scannedRules: rows.length,
		scannedChecks,
		movedChecks: candidates.length,
		skippedUnchanged,
		skippedMissingBefore,
		skippedMissingAfter,
		uncachedImages: guarded.usedImages,
		maxImages: guarded.maxImages,
		cacheHits: guarded.hits,
		cacheMisses: guarded.misses,
		counts: {
			regressions: sorted.filter((item) => item.priority === 'regression')
				.length,
			lowConfidence: sorted.filter((item) => item.priority === 'low-confidence')
				.length,
			spacingShifts: sorted.filter((item) => item.priority === 'spacing-shift')
				.length,
			clearlyMatches: sorted.filter(
				(item) => item.priority === 'clearly-matches',
			).length,
		},
		items: sorted,
	};
}

export type TriageVerdict = (typeof TRIAGE_VERDICTS)[number];

/** Advisory priority bucket governing report ordering. */
export type TriagePriority =
	| 'regression'
	| 'low-confidence'
	| 'spacing-shift'
	| 'clearly-matches';

/** Pixel-level comparison between a Before crop and an After crop. */
export interface CropPixelDiff {
	changed: boolean;
	movedPixels: number;
	totalPixels: number;
}

/** One moved Behind Bars check evaluated by Jev. */
export interface TriageCheckItem {
	ruleId: string;
	checkN: number;
	page: string;
	rule: string;
	fixtureName: string;
	question: string;
	verdict: TriageVerdict;
	verdictConfidence: number;
	verdictProbabilities: Record<string, number>;
	checkScore: number;
	lowConfidence: boolean;
	priority: TriagePriority;
	movedPixels: number;
	totalPixels: number;
	beforeSize: { width: number; height: number };
	afterSize: { width: number; height: number };
}

/** Summary and ordered items produced by `triageRuleCrops`. */
export interface TriageReport {
	since: string;
	scannedRules: number;
	scannedChecks: number;
	movedChecks: number;
	skippedUnchanged: number;
	skippedMissingBefore: number;
	skippedMissingAfter: number;
	uncachedImages: number;
	maxImages: number;
	cacheHits: number;
	cacheMisses: number;
	counts: {
		regressions: number;
		lowConfidence: number;
		spacingShifts: number;
		clearlyMatches: number;
	};
	items: TriageCheckItem[];
}

/** Options for `triageRuleCrops`. */
export interface RuleTriageOptions {
	/** Base git ref for Before crops; defaults to `main`. */
	since?: string;
	/** Optional subset of rule IDs to inspect; defaults to every rule in the ledger. */
	rules?: readonly string[];
	/** Hard per-run cap on uncached images sent to Jev; defaults to 25. */
	maxImages?: number;
	/** Threshold below which non-regression items surface as low-confidence; defaults to 0.7. */
	lowConfidenceThreshold?: number;
	/** Set false to bypass disk cache while keeping `--max-images` enforced. */
	useCache?: boolean;
	/** Optional override for the Jev content-hash cache directory. */
	cacheDir?: string;
	/** Optional override for the rule notes directory. */
	notesDir?: string;
	/** Jev client (e.g. `TypesafeJev` or `FakeJev` in tests). */
	client: JevClient;
	/** Swappable git reader for tests; defaults to `git show <ref>:<path>`. */
	readAt?: (ref: string, repoPath: string) => Promise<Uint8Array | null>;
	fs: Fs;
}

type TriageQuestions = {
	check: JevNoulQuestion;
	verdict: JevChoiceQuestion;
};

interface MovedCheckCandidate {
	ruleId: string;
	checkN: number;
	page: string;
	rule: string;
	fixtureName: string;
	question: string;
	diff: CropPixelDiff;
	beforeSize: { width: number; height: number };
	afterSize: { width: number; height: number };
	request: JevQueryRequest<TriageQuestions>;
}

/** Compares Before and After crop pixels exactly; returns `changed: false` when byte-identical. */
export function diffCropPixels(before: PNG, after: PNG): CropPixelDiff {
	const width = Math.max(before.width, after.width);
	const height = Math.max(before.height, after.height);
	const totalPixels = width * height;
	if (
		before.width === after.width &&
		before.height === after.height &&
		before.data.equals(after.data)
	) {
		return { changed: false, movedPixels: 0, totalPixels };
	}

	let movedPixels = 0;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const inBefore = x < before.width && y < before.height;
			const inAfter = x < after.width && y < after.height;
			if (!inBefore || !inAfter) {
				movedPixels += 1;
				continue;
			}
			const bi = (y * before.width + x) * 4;
			const ai = (y * after.width + x) * 4;
			if (
				before.data[bi] !== after.data[ai] ||
				before.data[bi + 1] !== after.data[ai + 1] ||
				before.data[bi + 2] !== after.data[ai + 2] ||
				before.data[bi + 3] !== after.data[ai + 3]
			) {
				movedPixels += 1;
			}
		}
	}
	return { changed: movedPixels > 0, movedPixels, totalPixels };
}

/**
 * Composes a single labeled Before (top) / After (bottom) PNG for Jev and fits it within
 * Jev's 280..1568px image bounds via `prepareJevImage`.
 */
export function composeBeforeAfterPng(before: PNG, after: PNG): Buffer {
	const pad = 12;
	const headerH = 22;
	const gap = 12;
	const contentW = Math.max(before.width, after.width, 160);
	const width = pad * 2 + contentW;
	const beforeTop = pad + headerH;
	const afterHeaderTop = beforeTop + before.height + gap;
	const afterTop = afterHeaderTop + headerH;
	const height = afterTop + after.height + pad;

	const canvas = new PNG({ width, height });
	fillRect(canvas, 0, 0, width, height, WHITE);

	drawBanner(canvas, pad, pad, contentW, headerH, 'BEFORE', BEFORE_BG);
	blitOpaque(before, canvas, pad, beforeTop);
	drawBorder(canvas, pad, beforeTop, contentW, before.height, BORDER);

	drawBanner(canvas, pad, afterHeaderTop, contentW, headerH, 'AFTER', AFTER_BG);
	blitOpaque(after, canvas, pad, afterTop);
	drawBorder(canvas, pad, afterTop, contentW, after.height, BORDER);

	return prepareJevImage(PNG.sync.write(canvas));
}

/** Orders triage results: regressions first, then low-confidence checks, then spacing shifts, then clearly matching. */
export function sortTriageItems(
	items: readonly TriageCheckItem[],
): TriageCheckItem[] {
	return [...items].sort((a, b) => {
		const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
		if (rankDiff !== 0) {
			return rankDiff;
		}
		if (a.priority === 'regression') {
			const confDiff = b.verdictConfidence - a.verdictConfidence;
			if (Math.abs(confDiff) > 1e-9) {
				return confDiff;
			}
			const checkDiff = a.checkScore - b.checkScore;
			if (Math.abs(checkDiff) > 1e-9) {
				return checkDiff;
			}
		} else if (a.priority === 'low-confidence') {
			const aMin = Math.min(a.verdictConfidence, a.checkScore);
			const bMin = Math.min(b.verdictConfidence, b.checkScore);
			if (Math.abs(aMin - bMin) > 1e-9) {
				return aMin - bMin;
			}
		}
		const ruleDiff = a.ruleId.localeCompare(b.ruleId);
		if (ruleDiff !== 0) {
			return ruleDiff;
		}
		return a.checkN - b.checkN;
	});
}

const PRIORITY_RANK: Record<TriagePriority, number> = {
	regression: 0,
	'low-confidence': 1,
	'spacing-shift': 2,
	'clearly-matches': 3,
};

function classifyPriority(
	verdict: TriageVerdict,
	lowConfidence: boolean,
): TriagePriority {
	if (verdict === 'regression') {
		return 'regression';
	}
	if (lowConfidence) {
		return 'low-confidence';
	}
	if (verdict === 'spacing_shift') {
		return 'spacing-shift';
	}
	return 'clearly-matches';
}

function selectRuleRows<T extends { id: string }>(
	rows: readonly T[],
	filter: readonly string[] | undefined,
): T[] {
	if (!filter || filter.length === 0) {
		return [...rows];
	}
	const byId = new Map(rows.map((row) => [row.id, row]));
	const missing = filter.filter((id) => !byId.has(id));
	if (missing.length > 0) {
		throw new Error(`unknown rule id(s): ${missing.join(', ')}`);
	}
	const seen = new Set<string>();
	const selected: T[] = [];
	for (const id of filter) {
		if (seen.has(id)) {
			continue;
		}
		seen.add(id);
		const row = byId.get(id);
		if (row) {
			selected.push(row);
		}
	}
	return selected;
}

function buildTriageRequest(
	rule: string,
	question: string,
	comparisonPng: Buffer,
): JevQueryRequest<TriageQuestions> {
	return {
		images: { comparison: comparisonPng },
		questions: {
			check: {
				type: 'noul',
				instructions: `Look ONLY at the AFTER (bottom) engraving crop. Behind Bars rule: ${rule}. Check question: ${question}`,
				criteria: {
					true: 'The AFTER (bottom) crop clearly satisfies the check question.',
					false:
						'The AFTER (bottom) crop violates the check question or has a visual engraving defect.',
				},
			},
			verdict: {
				type: 'choice',
				instructions: `Compare the BEFORE (top) and AFTER (bottom) engraving crops for this Behind Bars rule (${rule}) and check (${question}). Classify the visual change from BEFORE to AFTER.`,
				criteria: {
					clearly_matches:
						'AFTER clearly satisfies the rule with no meaningful engraving regression compared to BEFORE.',
					spacing_shift:
						'Only minor horizontal/vertical spacing, padding, or layout shift; notation remains clean and still satisfies the rule.',
					regression:
						'AFTER introduces a visual regression, collision, clipping, misplaced glyph, or violates the rule compared to BEFORE.',
				},
			},
		},
	};
}

type Rgb = readonly [number, number, number];
const WHITE: Rgb = [255, 255, 255];
const BORDER: Rgb = [203, 213, 225];
const BEFORE_BG: Rgb = [71, 85, 105];
const AFTER_BG: Rgb = [15, 118, 110];

const LETTERS: Record<string, readonly string[]> = {
	A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
	B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
	E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
	F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
	O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
	R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
	T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
};

function drawBanner(
	png: PNG,
	x: number,
	y: number,
	w: number,
	h: number,
	label: string,
	bg: Rgb,
): void {
	fillRect(png, x, y, w, h, bg);
	const scale = 2;
	const glyphW = 5 * scale;
	const step = glyphW + 3;
	const startX = x + 8;
	const startY = y + Math.floor((h - 7 * scale) / 2);
	for (let i = 0; i < label.length; i++) {
		const glyph = LETTERS[label[i] ?? ''];
		if (!glyph) {
			continue;
		}
		for (let gy = 0; gy < glyph.length; gy++) {
			const row = glyph[gy] ?? '';
			for (let gx = 0; gx < row.length; gx++) {
				if (row[gx] === '1') {
					fillRect(
						png,
						startX + i * step + gx * scale,
						startY + gy * scale,
						scale,
						scale,
						WHITE,
					);
				}
			}
		}
	}
}

function blitOpaque(src: PNG, dst: PNG, dx: number, dy: number): void {
	for (let y = 0; y < src.height; y++) {
		for (let x = 0; x < src.width; x++) {
			const si = (y * src.width + x) * 4;
			const tx = dx + x;
			const ty = dy + y;
			if (tx < 0 || ty < 0 || tx >= dst.width || ty >= dst.height) {
				continue;
			}
			const di = (ty * dst.width + tx) * 4;
			const alpha = (src.data[si + 3] ?? 255) / 255;
			for (let c = 0; c < 3; c++) {
				dst.data[di + c] = Math.round(
					(src.data[si + c] ?? 255) * alpha + 255 * (1 - alpha),
				);
			}
			dst.data[di + 3] = 255;
		}
	}
}

function fillRect(
	png: PNG,
	x: number,
	y: number,
	w: number,
	h: number,
	color: Rgb,
): void {
	for (let py = y; py < y + h; py++) {
		for (let px = x; px < x + w; px++) {
			setPixel(png, px, py, color);
		}
	}
}

function drawBorder(
	png: PNG,
	x: number,
	y: number,
	w: number,
	h: number,
	color: Rgb,
): void {
	if (w <= 0 || h <= 0) {
		return;
	}
	const x1 = x + w - 1;
	const y1 = y + h - 1;
	for (let px = x; px <= x1; px++) {
		setPixel(png, px, y, color);
		setPixel(png, px, y1, color);
	}
	for (let py = y; py <= y1; py++) {
		setPixel(png, x, py, color);
		setPixel(png, x1, py, color);
	}
}

function setPixel(png: PNG, x: number, y: number, color: Rgb): void {
	if (x < 0 || y < 0 || x >= png.width || y >= png.height) {
		return;
	}
	const i = (y * png.width + x) * 4;
	png.data[i] = color[0];
	png.data[i + 1] = color[1];
	png.data[i + 2] = color[2];
	png.data[i + 3] = 255;
}
