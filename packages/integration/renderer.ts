import * as path from 'node:path';
import type { ConfigInput, Score } from '@stringsync/vexml';
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
 * because `vex render` wants the page without the rest of the Renderer. */
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

// ponytail: mirrors vexml's DEFAULT_WIDTH — the public API doesn't expose it, so tests
// don't get privileged access. Bump if vexml's default reference width ever exceeds this.
const DEFAULT_WIDTH = 900;

// Pool size ~= perf-core count; bump if renders starve waiting for a page.
const POOL_SIZE = 8;

/**
 * A test's browser-side function. It is serialized into the page via toString(), so it
 * must be self-contained: no closing over test-scope variables — thread values through
 * `arg` (which must be structured-cloneable) instead. A module-level function in a test
 * file serializes the same way, so it can be passed AS `fn` — but an fn cannot call one
 * (that would be a closure). Besides the Score, the page offers only `window.render`.
 */
type BrowserFn<A, T> = (
	score: Score,
	container: HTMLDivElement,
	arg: A,
) => T | Promise<T>;

export interface RenderOptions<A, T> {
	/* Run against the live Score in the browser once it has rendered. Omit it for a test
	 * that only wants the screenshot. */
	fn?: BrowserFn<A, T>;
	/* Passed to `fn` as its third argument. Must be structured-cloneable: it crosses into
	 * the page, so a closure will not do. */
	arg?: A;
}

/**
 * Everything a browser test needs, in one object: the fixture server, one Chromium for
 * the whole run, a pool of font-warmed pages, and render(). Tests use the shared
 * `renderer` instance below; setup.ts starts and closes it around the run.
 *
 * One browser for the run because launching a second Chromium in the same run is flaky
 * in Docker — its teardown hangs past the hook timeout. And it must be Docker: pixel
 * matching is exact, so renders have to be bit-stable, and the pinned image (fonts,
 * Chromium build) is where that stability comes from. `vex test` runs the suite there;
 * setup.ts refuses to run anywhere else.
 */
export class Renderer {
	private server: ReturnType<typeof serve> | null = null;
	private browser: Promise<Browser> | null = null;

	// A pool of pages, each navigated (bundle loaded/parsed) exactly once and reused
	// across tests. Screenshot tests are stateless — they clear the container and
	// re-render — so a test borrows an idle page instead of paying newPage() (new
	// context) + goto() (bundle reload) itself. Pooling (vs. one shared page) lets
	// `it.concurrent` renders run on separate pages/renderer processes in parallel;
	// POOL_SIZE caps how many Chromiums churn at once.
	private readonly pages: Page[] = []; // every page created, for close()
	private readonly idle: Page[] = [];
	private readonly waiters: Array<(page: Page) => void> = [];
	private created = 0;

	/** Start the server and browser. Idempotent; render() calls it lazily, but starting
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

	/** Render a corpus file in the browser and return its screenshot PNG. */
	async screenshot(file: string, config: ConfigInput = {}): Promise<Buffer> {
		return (await this.render(file, config)).png;
	}

	/**
	 * Render a corpus file on a pooled page, run `opts.fn` against the live Score in the
	 * browser, and screenshot the container. Tests that only want pixels use screenshot();
	 * tests that only want data ignore `png`.
	 *
	 * A fixture is laid out to its reference width (8.5in unless the test overrides it);
	 * the result scales to any container at runtime, so a static viewport exercises the
	 * layout deterministically.
	 */
	async render<T = undefined, A = undefined>(
		file: string,
		config: ConfigInput,
		opts: RenderOptions<A, T> = {},
	): Promise<{ result: T; png: Buffer }> {
		const width =
			(config.layout?.type === 'standard'
				? config.layout.referenceWidth
				: undefined) ?? DEFAULT_WIDTH;
		// Default both fonts to the families the Docker image installs as system fonts (see
		// Dockerfile). Passing a family with no URL takes fonts.ts's "already available"
		// path — the browser resolves it synchronously instead of fetching Bravura's woff2
		// or Source Sans 3 from the Google Fonts CDN, so nothing races the layout. A test
		// that sets fonts.notation or fonts.text (spread last) overrides the default.
		const resolved: ConfigInput = {
			...config,
			fonts: {
				notation: { family: 'Bravura' },
				text: { family: 'Source Sans 3' },
				...config.fonts,
			},
		};
		return this.withPage(async (page) => {
			await page.setViewportSize({ width: width + 64, height: 600 });
			const result = (await page.evaluate(
				async ({ file, config, fnSrc, arg }) => {
					const res = await fetch(`/data/${file}`);
					const input = file.endsWith('.mxl')
						? await res.blob()
						: await res.text();
					const container = document.getElementById('screenshot');
					if (!(container instanceof HTMLDivElement)) {
						throw new Error('container not found');
					}
					container.replaceChildren();
					// Pages are pooled, so a style the previous test set would carry into this one.
					container.removeAttribute('style');
					const score = await window.render(input, container, config);
					if (!fnSrc) {
						return undefined;
					}
					// Rehydrate the test's function; it crossed the boundary as source text.
					const fn = new Function(`return (${fnSrc})`)();
					return await fn(score, container, arg);
				},
				{ file, config: resolved, fnSrc: opts.fn?.toString(), arg: opts.arg },
			)) as T;
			const png = await page.locator('#screenshot').screenshot();
			return { result, png };
		});
	}

	/** Borrow a pooled page for one render, returning it to the pool afterwards. */
	private async withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
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

/** The shared instance every test renders through. */
export const renderer = new Renderer();

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
