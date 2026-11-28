import type { Fs } from 'core/system';
import { DEFAULT_MAX_JEV_IMAGES, JevImageBudget } from './jev-budget';
import { JevCache } from './jev-cache';
import {
	type JevAnswer,
	type JevAnswers,
	type JevClient,
	type JevQueryRequest,
	type JevQuestion,
	type JevRequest,
	parseJevAnswers,
	toNoulQuery,
} from './jev-client';

/** Configuration for `GuardedJev`. */
export interface GuardedJevOptions {
	/** Maximum uncached images allowed in one run; defaults to 25. */
	maxImages?: number;
	/** Shared image budget instance; overrides `maxImages` when provided. */
	budget?: JevImageBudget;
	/** Custom disk cache instance; defaults to a `JevCache` under `vexml/.cache/jev`. */
	cache?: JevCache;
	/** Directory for the default disk cache; defaults to `DEFAULT_JEV_CACHE_DIR`. */
	cacheDir?: string;
	/** Filesystem seam for the default disk cache; defaults to `NodeFs`. */
	fs?: Fs;
	/** Pinned model version included in cache keys; defaults to `JEV_MODEL`. */
	model?: string;
	/** Set false to bypass disk caching while keeping the per-run image budget guard active. */
	useCache?: boolean;
}

/** Preflight summary returned after verifying a batch fits within the image budget. */
export interface JevBatchPlan {
	totalRequests: number;
	cachedRequests: number;
	uncachedRequests: number;
	uncachedImages: number;
	remainingAfter: number;
}

/**
 * Wraps a `JevClient` with a content-hash disk cache and a hard per-run uncached image cap.
 * Unchanged requests hit the cache without spending budget; oversized batches fail before any call.
 */
export class GuardedJev implements JevClient {
	private readonly budget: JevImageBudget;
	private readonly cache: JevCache | undefined;
	private readonly inflight = new Map<
		string,
		Promise<Record<string, JevAnswer>>
	>();
	private cacheHits = 0;
	private cacheMisses = 0;

	constructor(
		private readonly inner: JevClient,
		opts: GuardedJevOptions = {},
	) {
		this.budget =
			opts.budget ??
			new JevImageBudget({
				maxImages: opts.maxImages ?? DEFAULT_MAX_JEV_IMAGES,
			});
		this.cache =
			opts.useCache === false
				? undefined
				: (opts.cache ??
					new JevCache({
						dir: opts.cacheDir,
						fs: opts.fs,
						model: opts.model,
					}));
	}

	get maxImages(): number {
		return this.budget.maxImages;
	}

	get usedImages(): number {
		return this.budget.used;
	}

	get remainingImages(): number {
		return this.budget.remaining;
	}

	get hits(): number {
		return this.cacheHits;
	}

	get misses(): number {
		return this.cacheMisses;
	}

	available(): Promise<boolean> {
		return this.inner.available();
	}

	async ask(request: JevRequest): Promise<Record<string, number>> {
		const answers = await this.query(toNoulQuery(request));
		return Object.fromEntries(
			Object.entries(answers).map(([id, answer]) => [id, answer.noul]),
		);
	}

	async query<Q extends Record<string, JevQuestion>>(
		request: JevQueryRequest<Q>,
	): Promise<JevAnswers<Q>> {
		if (this.cache) {
			const cached = await this.cache.get(request);
			if (cached !== null) {
				this.cacheHits += 1;
				return cached;
			}
			const key = this.cache.keyFor(request);
			const pending = this.inflight.get(key);
			if (pending) {
				this.cacheHits += 1;
				return parseJevAnswers(request.questions, await pending);
			}
			const imageCount = Object.keys(request.images).length;
			this.budget.consume(imageCount);
			this.cacheMisses += 1;
			const run = (async () => {
				const answers = await this.inner.query(request);
				await this.cache?.set(request, answers);
				return answers as Record<string, JevAnswer>;
			})();
			this.inflight.set(key, run);
			try {
				return (await run) as JevAnswers<Q>;
			} finally {
				if (this.inflight.get(key) === run) {
					this.inflight.delete(key);
				}
			}
		}
		const imageCount = Object.keys(request.images).length;
		this.budget.consume(imageCount);
		this.cacheMisses += 1;
		return this.inner.query(request);
	}

	/**
	 * Counts unique uncached images in `requests` and throws before sending any API call
	 * if running the batch would exceed the remaining per-run image cap.
	 */
	async preflight(requests: readonly JevQueryRequest[]): Promise<JevBatchPlan> {
		let cachedRequests = 0;
		let uncachedRequests = 0;
		let uncachedImages = 0;
		const seenUncached = new Set<string>();

		for (const request of requests) {
			if (this.cache) {
				const key = this.cache.keyFor(request);
				if (seenUncached.has(key) || (await this.cache.has(request))) {
					cachedRequests += 1;
					continue;
				}
				seenUncached.add(key);
			}
			uncachedRequests += 1;
			uncachedImages += Object.keys(request.images).length;
		}

		this.budget.check(uncachedImages);
		return {
			totalRequests: requests.length,
			cachedRequests,
			uncachedRequests,
			uncachedImages,
			remainingAfter: this.budget.remaining - uncachedImages,
		};
	}

	/** Preflights the entire batch against the cache and budget, then executes every request. */
	async queryBatch<Q extends Record<string, JevQuestion>>(
		requests: readonly JevQueryRequest<Q>[],
	): Promise<Array<JevAnswers<Q>>> {
		await this.preflight(requests);
		const results: Array<JevAnswers<Q>> = [];
		for (const request of requests) {
			results.push(await this.query(request));
		}
		return results;
	}
}
