import type { Fs } from 'core/system';
import type { PNG } from 'pngjs';
import { GuardedJev } from './guarded-jev';
import type {
	JevBox,
	JevBoxQuestion,
	JevClient,
	JevQueryRequest,
} from './jev-client';
import {
	type FractionalBox,
	prepareJevImageWithTransform,
	unmapJevBox,
} from './jev-image';
import { type BookCropper, type BookPageImage, cropPng } from './rule-book';

/** Default Jev confidence threshold below which a returned box is flagged `low-confidence`. */
export const DEFAULT_MIN_CONFIDENCE = 0.5;
/** Minimum fractional width before a returned box is flagged as collapsed (`tiny-box`). */
export const MIN_BOX_WIDTH = 0.02;
/** Minimum fractional height before a returned box is flagged as collapsed (`tiny-box`). */
export const MIN_BOX_HEIGHT = 0.015;

/**
 * Locates Behind Bars music examples by batching all queries for each distinct print page into
 * a single Jev `box` request, un-mapping returned coordinates back to page fractions, and
 * validating each crop with five-line stave detection.
 */
export class BookBoxFinder {
	private readonly guarded: GuardedJev;
	private readonly minConfidence: number;

	constructor(
		private readonly cropper: BookCropper,
		client: JevClient,
		opts: BookBoxFinderOptions = {},
	) {
		this.minConfidence = opts.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
		this.guarded =
			client instanceof GuardedJev
				? client
				: new GuardedJev(client, {
						maxImages: opts.maxImages,
						cacheDir: opts.cacheDir,
						useCache: opts.useCache,
						fs: opts.fs,
					});
	}

	/** Runs batched per-page `box` queries, failing before any API call if over `--max-images`. */
	async find(queries: readonly BookBoxQuery[]): Promise<BookBoxRunResult> {
		if (queries.length === 0) {
			return {
				results: [],
				pages: 0,
				uncachedImages: 0,
				cacheHits: 0,
				cacheMisses: 0,
				maxImages: this.guarded.maxImages,
			};
		}

		const pageGroups = groupByPage(queries);
		const preparedPages: PreparedPageBatch[] = [];
		for (const group of pageGroups) {
			const loaded = await this.cropper.readPage(group.page);
			if (!loaded) {
				throw new Error(
					`Behind Bars page ${JSON.stringify(group.page)} was not found in the local book directory`,
				);
			}
			const prepared = prepareJevImageWithTransform(loaded.png);
			const questions: Record<string, JevBoxQuestion> = {};
			for (const [i, item] of group.items.entries()) {
				questions[`q${i}`] = {
					type: 'box',
					instructions: buildBookBoxInstruction(item.query.description),
				};
			}
			preparedPages.push({
				page: group.page,
				loaded,
				prepared,
				items: group.items,
				request: {
					images: { page: prepared.png },
					questions,
				},
			});
		}

		const requests = preparedPages.map((batch) => batch.request);
		const usedBefore = this.guarded.usedImages;
		const hitsBefore = this.guarded.hits;
		const missesBefore = this.guarded.misses;
		const answersList = await this.guarded.queryBatch(requests);

		const ordered: Array<BookBoxResult | undefined> = new Array(queries.length);
		for (const [pageIdx, batch] of preparedPages.entries()) {
			const answers = answersList[pageIdx];
			if (!answers) {
				throw new Error(`missing Jev response for page ${batch.page}`);
			}
			for (const [i, item] of batch.items.entries()) {
				const answer = answers[`q${i}`];
				if (!answer) {
					throw new Error(
						`missing Jev box answer q${i} for page ${batch.page}`,
					);
				}
				const box = unmapJevBox(answer.box, batch.prepared.transform);
				const { staffSpace, flags } = validateBookBoxCrop(
					batch.loaded.image,
					box,
					answer.confidence,
					this.minConfidence,
				);
				ordered[item.index] = {
					id: item.query.id,
					page: batch.page,
					description: item.query.description,
					box,
					rawBox: answer.box,
					confidence: answer.confidence,
					staffSpace,
					flags,
					bookLine: formatBookLine(batch.page, box),
				};
			}
		}

		return {
			results: ordered.filter((r): r is BookBoxResult => r !== undefined),
			pages: preparedPages.length,
			uncachedImages: this.guarded.usedImages - usedBefore,
			cacheHits: this.guarded.hits - hitsBefore,
			cacheMisses: this.guarded.misses - missesBefore,
			maxImages: this.guarded.maxImages,
		};
	}
}

/** Formats fractional page coordinates as a `Book:` line guaranteed to stay within `0..1`. */
export function formatBookLine(page: string, box: FractionalBox): string {
	const x = round3(clamp(box.x, 0, 1));
	const y = round3(clamp(box.y, 0, 1));
	const w = round3(clamp(box.w, 0, Math.max(0, 1 - x)));
	const h = round3(clamp(box.h, 0, Math.max(0, 1 - y)));
	return `Book: p. ${page.toLowerCase()}, ${x.toFixed(3)} ${y.toFixed(3)} ${w.toFixed(3)} ${h.toFixed(3)}`;
}

/** Builds the Jev `box` instruction asking for one engraved music example on `page`. */
export function buildBookBoxInstruction(description: string): string {
	const clean = description.trim();
	return `In the Behind Bars book page image \`page\`, draw a tight bounding box around the engraved music notation example (five-line stave and its attached musical symbols, excluding surrounding prose paragraphs) that illustrates: ${clean}`;
}

/** Validates an unmapped fractional box against the full-resolution page image and confidence floor. */
export function validateBookBoxCrop(
	image: PNG,
	box: FractionalBox,
	confidence: number,
	minConfidence = DEFAULT_MIN_CONFIDENCE,
): { staffSpace: number | null; flags: BookBoxFlag[] } {
	const flags: BookBoxFlag[] = [];
	if (confidence < minConfidence) {
		flags.push('low-confidence');
	}
	if (box.w < MIN_BOX_WIDTH || box.h < MIN_BOX_HEIGHT) {
		flags.push('tiny-box');
	}
	const cropped = cropPng(image, box);
	const staffSpace = cropped?.detectedSpace ?? null;
	if (staffSpace === null) {
		flags.push('no-stave');
	}
	return { staffSpace, flags };
}

/** Validation warnings attached to a predicted Behind Bars example box. */
export type BookBoxFlag = 'low-confidence' | 'no-stave' | 'tiny-box';

/** One Behind Bars music example to locate on a print page. */
export interface BookBoxQuery {
	/** Stable identifier echoed in the result (e.g. `<rule-id>#<check>` or `q1`). */
	id: string;
	/** Behind Bars print page label, e.g. `135` or `xi`. */
	page: string;
	/** Plain-language description of the engraved music example to box. */
	description: string;
}

/** One located Behind Bars example, mapped back to original page fractions and stave-checked. */
export interface BookBoxResult {
	id: string;
	page: string;
	description: string;
	box: FractionalBox;
	rawBox: JevBox;
	confidence: number;
	/** Detected staff space in pixels on the full-resolution crop, or null when no stave stood out. */
	staffSpace: number | null;
	flags: BookBoxFlag[];
	/** Ready-to-paste `Book: p. <page>, <x> <y> <w> <h>` line for a rule note. */
	bookLine: string;
}

/** Outcome of one batched `BookBoxFinder` run with cache and image-budget counts. */
export interface BookBoxRunResult {
	results: BookBoxResult[];
	pages: number;
	uncachedImages: number;
	cacheHits: number;
	cacheMisses: number;
	maxImages: number;
}

/** Configuration for `BookBoxFinder`. */
export interface BookBoxFinderOptions {
	/** Hard per-run cap on uncached page images sent to Jev; defaults to 25. */
	maxImages?: number;
	/** Confidence below which a box is flagged `low-confidence`; defaults to 0.5. */
	minConfidence?: number;
	/** Directory for the content-hash disk cache; defaults to `vexml/.cache/jev`. */
	cacheDir?: string;
	/** Set false to bypass disk caching while keeping the image budget cap active. */
	useCache?: boolean;
	/** Filesystem seam for the default disk cache; defaults to `NodeFs`. */
	fs?: Fs;
}

interface IndexedQuery {
	index: number;
	query: BookBoxQuery;
}

interface PageGroup {
	page: string;
	items: IndexedQuery[];
}

interface PreparedPageBatch {
	page: string;
	loaded: BookPageImage;
	prepared: ReturnType<typeof prepareJevImageWithTransform>;
	items: IndexedQuery[];
	request: JevQueryRequest<Record<string, JevBoxQuestion>>;
}

function groupByPage(queries: readonly BookBoxQuery[]): PageGroup[] {
	const byPage = new Map<string, PageGroup>();
	for (const [index, query] of queries.entries()) {
		const key = query.page.trim().toLowerCase();
		let group = byPage.get(key);
		if (!group) {
			group = { page: key, items: [] };
			byPage.set(key, group);
		}
		group.items.push({ index, query });
	}
	return [...byPage.values()];
}

function round3(value: number): number {
	return Math.round(value * 1000) / 1000;
}

function clamp(value: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, value));
}
