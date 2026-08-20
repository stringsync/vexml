import * as path from 'node:path';
import {
	type Browser,
	bundle,
	PlaywrightBrowser,
	type Tab,
} from '@vexml/browser';

/* The tab shell every render mounts into: page.ts's script targets #screenshot and the
 * screenshots crop to it. The padding gives engravings that overshoot their box a margin
 * to land in; inline-block shrinkwraps the div to the canvas. */
export const PAGE_HTML =
	'<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}#screenshot{padding:16px;display:inline-block}</style></head><body><div id="screenshot"></div></body></html>';

let script: Promise<string> | null = null;

/** page.ts (the browser side of the harness) as an injectable script, bundled once per
 * process. Exported alongside PAGE_HTML because `vex render` opens the same page. */
export function pageScript(): Promise<string> {
	script ??= bundle(path.resolve(import.meta.dir, 'page.ts'));
	return script;
}

// Pool size ~= perf-core count; bump if renders starve waiting for a tab.
const POOL_SIZE = 8;

/**
 * A pool of tabs, each loaded with the harness page exactly once and reused across
 * tests. Screenshot tests are stateless — they clear the container and re-render — so a
 * test borrows an idle tab instead of paying open() (a fresh page plus a ~2MB bundle
 * parse) itself. Pooling (vs. one shared tab) lets `it.concurrent` renders run on
 * separate tabs/renderer processes in parallel; POOL_SIZE caps how many churn at once.
 *
 * One Browser for the whole run because launching a second Chromium in the same run is
 * flaky in Docker — its teardown hangs past the hook timeout. And it must be Docker:
 * pixel matching is exact, so renders have to be bit-stable, and the pinned image
 * (fonts, Chromium build) is where that stability comes from. `vex test` runs the suite
 * there; setup.ts refuses to run anywhere else.
 */
export class TabPool {
	constructor(private readonly browser: Browser = new PlaywrightBrowser()) {}

	private readonly idle: Tab[] = [];
	private readonly waiters: Array<(tab: Tab) => void> = [];
	private created = 0;

	/** Warm the pool — bundle the page, launch the browser — by opening the first tab.
	 * withTab() would do it lazily; setup.ts calls this eagerly (beforeAll) to keep the
	 * launch out of the first test's timeout. */
	async start(): Promise<void> {
		this.release(await this.acquire());
	}

	/** Close the browser, and with it every tab. */
	close(): Promise<void> {
		return this.browser.close();
	}

	/** Borrow a pooled tab for one render, returning it to the pool afterwards. */
	async withTab<T>(fn: (tab: Tab) => Promise<T>): Promise<T> {
		const tab = await this.acquire();
		try {
			return await fn(tab);
		} finally {
			this.release(tab);
		}
	}

	private async acquire(): Promise<Tab> {
		const free = this.idle.pop();
		if (free) {
			return free;
		}
		if (this.created < POOL_SIZE) {
			this.created++; // reserve the slot synchronously, before the awaits below yield
			return this.browser.open({
				html: PAGE_HTML,
				scripts: [await pageScript()],
				width: 964,
				height: 600,
			});
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
