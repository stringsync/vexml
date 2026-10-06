import type { AsyncResource } from 'webappwiz/disposable';
import type { Browser } from './browser';
import { PlaywrightBrowser } from './playwright-browser';
import { type PageSpec, TabPool } from './pool';

/**
 * The browser tabs every renderer factory borrows from, one pool per engine page. Ask
 * for a page's pool with pool(), and release everything with disposeAsync() (which
 * renderers.disposeAsync() calls).
 */
export class TabPools implements AsyncResource {
	// One browser process for the whole run, since launching a second Chromium in the
	// same run is flaky in Docker, where its teardown hangs past hook timeouts. The
	// browser and the pools are created lazily on the first render.
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
