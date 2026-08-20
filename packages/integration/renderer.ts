import type { ConfigInput, Score } from '@stringsync/vexml';
import { PagePool } from './pool';

// ponytail: mirrors vexml's DEFAULT_WIDTH — the public API doesn't expose it, so tests
// don't get privileged access. Bump if vexml's default reference width ever exceeds this.
const DEFAULT_WIDTH = 900;

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

/** Runs inside the page (serialized by page.evaluate, so self-contained): fetch the
 * fixture, render it into a fresh container, and run the test's rehydrated fn. */
async function renderInPage({
	file,
	config,
	fnSrc,
	arg,
}: {
	file: string;
	config: ConfigInput;
	fnSrc?: string;
	arg: unknown;
}): Promise<unknown> {
	const res = await fetch(`/data/${file}`);
	const input = file.endsWith('.mxl') ? await res.blob() : await res.text();
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
}

/* The width a fixture lays out to (8.5in unless the test overrides it); the result
 * scales to any container at runtime, so a static viewport exercises the layout
 * deterministically. */
function referenceWidth(config: ConfigInput): number {
	return (
		(config.layout?.type === 'standard'
			? config.layout.referenceWidth
			: undefined) ?? DEFAULT_WIDTH
	);
}

/* Default both fonts to the families the Docker image installs as system fonts (see
 * Dockerfile). Passing a family with no URL takes fonts.ts's "already available" path —
 * the browser resolves it synchronously instead of fetching Bravura's woff2 or Source
 * Sans 3 from the Google Fonts CDN, so nothing races the layout. A test that sets
 * fonts.notation or fonts.text (spread last) overrides the default. */
function withDefaultFonts(config: ConfigInput): ConfigInput {
	return {
		...config,
		fonts: {
			notation: { family: 'Bravura' },
			text: { family: 'Source Sans 3' },
			...config.fonts,
		},
	};
}

/**
 * Renders corpus files for tests. The infrastructure — fixture server, browser, pooled
 * pages — lives in the PagePool (see pool.ts); this class only turns a fixture + config
 * into a screenshot and/or a value computed against the live Score. Tests use the shared
 * `renderer` instance below; setup.ts starts and closes it around the run.
 */
export class Renderer {
	constructor(private readonly pool = new PagePool()) {}

	start() {
		return this.pool.start();
	}

	close() {
		return this.pool.close();
	}

	/** Render a corpus file in the browser and return its screenshot PNG. */
	async screenshot(file: string, config: ConfigInput = {}): Promise<Buffer> {
		return (await this.render(file, config)).png;
	}

	/**
	 * Render a corpus file on a pooled page, run `opts.fn` against the live Score in the
	 * browser, and screenshot the container. Tests that only want pixels use screenshot();
	 * tests that only want data ignore `png`.
	 */
	async render<T = undefined, A = undefined>(
		file: string,
		config: ConfigInput,
		opts: RenderOptions<A, T> = {},
	): Promise<{ result: T; png: Buffer }> {
		return this.pool.withPage(async (page) => {
			await page.setViewportSize({
				width: referenceWidth(config) + 64,
				height: 600,
			});
			const result = (await page.evaluate(renderInPage, {
				file,
				config: withDefaultFonts(config),
				fnSrc: opts.fn?.toString(),
				arg: opts.arg,
			})) as T;
			const png = await page.locator('#screenshot').screenshot();
			return { result, png };
		});
	}
}

/** The shared instance every test renders through. */
export const renderer = new Renderer();
