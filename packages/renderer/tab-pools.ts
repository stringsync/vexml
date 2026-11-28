import type { AsyncResource } from 'core/disposable';
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

	/** Screenshot `selector` on a one-off tab of the shared browser loaded with `html`. */
	async snapshot(opts: HtmlSnapshotInput): Promise<Buffer> {
		this.browser ??= new PlaywrightBrowser();
		const tab = await this.browser.open({
			html: opts.html,
			width: opts.width,
			height: opts.height,
		});
		try {
			return await tab.screenshot(opts.selector);
		} finally {
			await tab.disposeAsync();
		}
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

/** A self-contained HTML document (inline styles, data-URL images) to capture. */
export interface HtmlSnapshotInput {
	html: string;
	/** The element to capture. */
	selector: string;
	/** Viewport size in CSS pixels; the capture reaches below it but not past its width. */
	width: number;
	height: number;
}

/** The one set of pools for the run: every renderer borrows its tabs from here, and
 * renderers.disposeAsync() releases it. */
export const tabPools = new TabPools();
