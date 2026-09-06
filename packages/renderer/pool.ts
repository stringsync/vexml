import { AsyncDisposer, type AsyncResource } from 'webappwiz/disposable';
import type { Browser } from './browser';
import { PlaywrightBrowser } from './playwright-browser';
import type { Tab } from './tab';

/** One engine's page: the tab shell its renders mount into, and the classic scripts
 * (see OpenOptions.scripts) that register its mount/evaluate globals. scripts() is
 * async so an engine can bundle lazily, on the first render. */
export interface PageSpec {
	html: string;
	scripts(): Promise<string[]>;
	width: number;
	height: number;
}

// Pool size ~= perf-core count; bump if renders starve waiting for a tab.
const POOL_SIZE = 8;

/**
 * A pool of tabs, each loaded with one engine's page exactly once and reused across
 * renders. Renders are stateless (mount clears the container and re-renders), so a
 * render borrows an idle tab instead of paying open() (a fresh page plus a ~2MB bundle
 * parse) itself. Pooling (vs. one shared tab) lets concurrent renders run on separate
 * tabs/renderer processes in parallel; POOL_SIZE caps how many churn at once.
 */
export class TabPool implements AsyncResource {
	constructor(
		private readonly browser: Browser,
		private readonly spec: PageSpec,
	) {}

	private readonly disposer = new AsyncDisposer();
	private readonly idle: Tab[] = [];
	private readonly waiters: Array<(tab: Tab) => void> = [];
	private created = 0;

	/** Borrow a pooled tab for one render, returning it to the pool afterwards. */
	async withTab<T>(fn: (tab: Tab) => Promise<T>): Promise<T> {
		const tab = await this.acquire();
		try {
			return await fn(tab);
		} finally {
			this.release(tab);
		}
	}

	/** Closes every tab this pool opened. The pool is spent afterwards. */
	disposeAsync = this.disposer.disposeAsync;

	private async acquire(): Promise<Tab> {
		const free = this.idle.pop();
		if (free) {
			return free;
		}
		if (this.created < POOL_SIZE) {
			this.created++; // reserve the slot synchronously, before the awaits below yield
			return this.disposer.use(
				await this.browser.open({
					html: this.spec.html,
					scripts: await this.spec.scripts(),
					width: this.spec.width,
					height: this.spec.height,
				}),
			);
		}
		return new Promise((resolve) => this.waiters.push(resolve));
	}

	private release(tab: Tab): void {
		const waiter = this.waiters.shift();
		if (waiter) {
			waiter(tab);
		} else {
			this.idle.push(tab);
		}
	}
}

/**
 * The shared machinery behind every factory: one browser process for the whole run
 * (launching a second Chromium in the same run is flaky in Docker, where its teardown
 * hangs past hook timeouts) and one pool per engine page, all created lazily on the
 * first render. renderers.disposeAsync() tears it all down.
 */
export class TabPools implements AsyncResource {
	private browser: Browser | null = null;
	private readonly pools = new Map<string, TabPool>();

	/** The pool for `key`'s page, created against the shared browser on first use. */
	pool(key: string, spec: PageSpec): TabPool {
		let existing = this.pools.get(key);
		if (!existing) {
			this.browser ??= new PlaywrightBrowser();
			existing = new TabPool(this.browser, spec);
			this.pools.set(key, existing);
		}
		return existing;
	}

	/** Close the pooled tabs and the shared browser, and forget the pools. Rendering
	 * after this lazily starts fresh machinery. */
	async disposeAsync(): Promise<void> {
		const pools = [...this.pools.values()];
		const browser = this.browser;
		this.pools.clear();
		this.browser = null;
		for (const pool of pools) {
			await pool.disposeAsync();
		}
		await browser?.disposeAsync();
	}
}

/** The one set of pools for the run: every renderer borrows its tabs from here, and
 * renderers.disposeAsync() releases it. */
export const tabPools = new TabPools();
