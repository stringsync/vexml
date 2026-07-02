import type { Config, Score } from '@stringsync/vexml';
import { withPage } from './setup';

// ponytail: mirrors src DEFAULT_WIDTH — the public API doesn't expose it, so tests
// don't get privileged access. Bump if src's default reference width ever exceeds this.
const DEFAULT_WIDTH = 900;

// A fixture is laid out to its reference width (8.5in unless the test overrides it);
// the result scales to any container at runtime, so a static viewport exercises the
// layout deterministically. The browser and page server are shared across the whole run
// (see setup.ts) — launching a second Chromium per file is flaky in Docker.

/**
 * A test's browser-side function. It is serialized into the page via toString(), so it
 * must be self-contained: no closing over test-scope variables — thread values through
 * `arg` (which must be structured-cloneable) instead.
 */
type BrowserFn<A, T> = (
	score: Score,
	container: HTMLDivElement,
	arg: A,
) => T | Promise<T>;

/**
 * Render a corpus file on a pooled page, run `fn` against the live Score in the browser,
 * and screenshot the container. Tests that only want pixels ignore `result`; tests that
 * only want data ignore `png`.
 */
export async function renderTest<T = undefined, A = undefined>(
	file: string,
	config: Partial<Config>,
	fn?: BrowserFn<A, T>,
	arg?: A,
): Promise<{ result: T; png: Buffer }> {
	const width =
		(config.layout?.type === 'standard'
			? config.layout.referenceWidth
			: undefined) ?? DEFAULT_WIDTH;
	// Default both fonts to the families the Docker image installs as system fonts (see
	// Dockerfile). Passing a family with no URL takes fonts.ts's "already available" path —
	// the browser resolves it synchronously instead of fetching Bravura's woff2 or Source
	// Sans 3 from the Google Fonts CDN, so nothing races the layout. A test that sets
	// fonts.notation or fonts.text (spread last) overrides the corresponding default.
	const resolved: Partial<Config> = {
		...config,
		fonts: {
			notation: { family: 'Bravura' },
			text: { family: 'Source Sans 3' },
			...config.fonts,
		},
	};
	return withPage(async (page) => {
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
				container.replaceChildren(); // clear the previous test's render
				container.removeAttribute('style'); // and any styles it set (pages are pooled)
				const score = await window.render(input, container, config);
				if (!fnSrc) {
					return undefined;
				}
				// Rehydrate the test's function; it crossed the boundary as source text.
				const fn = new Function(`return (${fnSrc})`)();
				return await fn(score, container, arg);
			},
			{ file, config: resolved, fnSrc: fn?.toString(), arg },
		)) as T;
		const png = await page.locator('#screenshot').screenshot();
		return { result, png };
	});
}

/** Render a corpus file in the browser and return its screenshot PNG. */
export async function render(
	file: string,
	config: Partial<Config>,
): Promise<Buffer> {
	return (await renderTest(file, config)).png;
}
