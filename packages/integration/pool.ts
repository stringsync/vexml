import * as path from 'node:path';
import { type Browser, chromium, type Page } from 'playwright';
import index from './index.html';

const DATA_DIR = path.resolve(import.meta.dir, './__data__');

/* How many ports past `from` to try before giving up. Enough for a handful of concurrent
 * runs (a test suite, a `vex render`, a stale server) without scanning forever. */
const PORT_ATTEMPTS = 20;

/* Serves the test page (page.ts inside index.html) and the fixture corpus
 * (`/data/:file` from `__data__/`). `from` is a starting point, not a demand: a second
 * copy, or anything else already on the port, moves this one along. Read the port it
 * actually got off the returned server rather than assuming `from`. Exported on its own
 * because `vex render` wants the page without the rest of the pool. */
export function serve(from = 3100) {
	for (let port = from; port < from + PORT_ATTEMPTS; port++) {
		try {
			return Bun.serve({
				port,
				routes: {
					'/': index,
					'/data/:file': (req) =>
						new Response(Bun.file(path.join(DATA_DIR, req.params.file))),
				},
			});
		} catch (error) {
			// Bun reports the taken port on `code`, not in the message ("Failed to start
			// server. Is port 3100 in use?"), so matching the text would never fire.
			if ((error as { code?: string })?.code !== 'EADDRINUSE') {
				throw error;
			}
		}
	}
	throw new Error(
		`serve: no free port between ${from} and ${from + PORT_ATTEMPTS}`,
	);
}

// Pool size ~= perf-core count; bump if renders starve waiting for a page.
const POOL_SIZE = 8;

/**
 * The infrastructure a browser test renders through: the fixture server, one Chromium
 * for the whole run, and a pool of font-warmed pages navigated to the test page.
 *
 * One browser for the run because launching a second Chromium in the same run is flaky
 * in Docker — its teardown hangs past the hook timeout. And it must be Docker: pixel
 * matching is exact, so renders have to be bit-stable, and the pinned image (fonts,
 * Chromium build) is where that stability comes from. `vex test` runs the suite there;
 * setup.ts refuses to run anywhere else.
 *
 * Each page is navigated (bundle loaded/parsed) exactly once and reused across tests.
 * Screenshot tests are stateless — they clear the container and re-render — so a test
 * borrows an idle page instead of paying newPage() (new context) + goto() (bundle
 * reload) itself. Pooling (vs. one shared page) lets `it.concurrent` renders run on
 * separate pages/renderer processes in parallel; POOL_SIZE caps how many Chromiums
 * churn at once.
 */
export class PagePool {
	private server: ReturnType<typeof serve> | null = null;
	private browser: Promise<Browser> | null = null;

	private readonly pages: Page[] = []; // every page created, for close()
	private readonly idle: Page[] = [];
	private readonly waiters: Array<(page: Page) => void> = [];
	private created = 0;

	/** Start the server and browser. Idempotent; withPage() calls it lazily, but starting
	 * eagerly (setup.ts's beforeAll) keeps the launch out of the first test's timeout. */
	start(): Promise<Browser> {
		this.server ??= serve();
		this.browser ??= chromium.launch();
		return this.browser;
	}

	async close(): Promise<void> {
		await Promise.all(this.pages.map((page) => page.close()));
		if (this.browser) {
			await (await this.browser).close();
		}
		this.server?.stop(true);
	}

	/** Borrow a pooled page for one render, returning it to the pool afterwards. */
	async withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
		const page = await this.acquire();
		try {
			return await fn(page);
		} finally {
			this.release(page);
		}
	}

	private async acquire(): Promise<Page> {
		const free = this.idle.pop();
		if (free) {
			return free;
		}
		if (this.created < POOL_SIZE) {
			this.created++; // reserve the slot synchronously, before the awaits below yield
			const browser = await this.start();
			const page = await browser.newPage({
				viewport: { width: 964, height: 600 },
			});
			// The port the server actually got: serve() moves along when 3100 is taken, so a
			// run alongside another one still points at its own server.
			await page.goto(`http://localhost:${this.server?.port}/`);
			await warmFonts(page);
			this.pages.push(page);
			return page;
		}
		return new Promise((resolve) => this.waiters.push(resolve));
	}

	private release(page: Page): void {
		const waiter = this.waiters.shift();
		if (waiter) {
			waiter(page);
		} else {
			this.idle.push(page);
		}
	}
}

// Make the render fonts resident in the context's font cache before any real render.
// Chromium loads even a system font lazily on first use, and VexFlow positions tab fret
// digits by measuring them — so the first render on a cold page measures glyphs before the
// font is resident and places them bistably. A reused single page self-warms after its first
// test; a pool starts every page cold, so under parallel load many renders measure cold and
// flake. Rendering the warm-up fixture once paints every font/weight a real render uses,
// forcing the load up front. Same system families the tests use; if a new test uses a new
// font/weight and flakes, extend font_warmup.musicxml to paint it.
async function warmFonts(page: Page): Promise<void> {
	await page.evaluate(async () => {
		const container = document.getElementById('screenshot');
		if (!(container instanceof HTMLDivElement)) {
			throw new Error('container not found');
		}
		const res = await fetch('/data/font_warmup.musicxml');
		await window.render(await res.text(), container, {
			showPartLabels: true, // paints the part names in Source Sans 3 regular
			fonts: {
				notation: { family: 'Bravura' },
				text: { family: 'Source Sans 3' },
			},
		});
		await document.fonts.ready;
		container.replaceChildren();
	});
}
