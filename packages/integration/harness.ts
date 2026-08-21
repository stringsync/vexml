import * as path from 'node:path';
import type { ConfigInput, Score } from '@stringsync/vexml';
import { TabPool } from './pool';

/*
 * How tests reach the corpus: screenshot() for pixels, probe() for a value computed
 * against the live Score (with the pixels riding along). Both fold the repo's test
 * conventions — the __data__ corpus, the Docker system fonts, the reference-width
 * viewport, the #screenshot crop — over a shared pool of tabs (see pool.ts), so a test
 * states only what it is about. setup.ts start()s and close()s the pool around the run.
 */

const DATA_DIR = path.resolve(import.meta.dir, './__data__');

// ponytail: mirrors vexml's DEFAULT_WIDTH — the public API doesn't expose it, so tests
// don't get privileged access. Bump if vexml's default reference width ever exceeds this.
const DEFAULT_WIDTH = 900;

const pool = new TabPool();

/** Warm the pool (bundle the page, launch the browser). Idempotent-enough for its one
 * caller: setup.ts's beforeAll, keeping the launch out of the first test's timeout. */
export function start(): Promise<void> {
	return pool.start();
}

export function close(): Promise<void> {
	return pool.close();
}

/** Render a corpus file in the browser and return its screenshot PNG. */
export async function screenshot(
	file: string,
	config: ConfigInput = {},
): Promise<Buffer> {
	return (await run(file, config)).png;
}

/** Render a corpus file, run `fn` against the live Score in the browser, and return
 * fn's result along with the screenshot (some tests assert on both; ignore `png` if
 * pixels aren't the point). For pixels alone, use screenshot(). */
export async function probe<T, A = undefined>(
	file: string,
	config: ConfigInput,
	fn: BrowserFn<A, T>,
	arg?: A,
): Promise<{ result: T; png: Buffer }> {
	const { result, png } = await run(file, config, fn.toString(), arg);
	return { result: result as T, png };
}

/** A corpus fixture's text — for the rare test that feeds one to its fn via probe's
 * `arg`. */
export function fixture(file: string): Promise<string> {
	return Bun.file(path.join(DATA_DIR, file)).text();
}

/**
 * A test's browser-side function, probe()'s third argument. It crosses into the page as
 * source text (toString), so it must be self-contained: no closing over test-scope
 * variables — thread values through `arg` (which must be structured-cloneable) instead.
 * A module-level function in a test file serializes the same way, so it can be passed
 * AS the fn — but an fn cannot call one (that would be a closure). Besides the Score,
 * the page offers only `window.render`.
 */
type BrowserFn<A, T> = (
	score: Score,
	container: HTMLDivElement,
	arg: A,
) => T | Promise<T>;

/* One render on a pooled tab: mount the fixture, run the serialized fn (if any),
 * screenshot the container. A fixture is laid out to its reference width (8.5in unless
 * the config overrides it); the result scales to any container at runtime, so a static
 * viewport exercises the layout deterministically. */
async function run(
	file: string,
	config: ConfigInput,
	fnSrc?: string,
	arg?: unknown,
): Promise<{ result: unknown; png: Buffer }> {
	return pool.withTab(async (tab) => {
		await tab.resize(referenceWidth(config) + 64, 600);
		await tab.call('mount', {
			...(await input(file)),
			config: withDefaultFonts(config),
		});
		const result = fnSrc
			? await tab.call<unknown>('probe', { fnSrc, arg })
			: undefined;
		const png = await tab.screenshot('#screenshot');
		return { result, png };
	});
}

/** A fixture's content, keyed the way page.ts's mount expects it: text for MusicXML,
 * base64 bytes for compressed .mxl. */
async function input(
	file: string,
): Promise<{ musicXML: string } | { mxl: string }> {
	const fixture = Bun.file(path.join(DATA_DIR, file));
	if (file.endsWith('.mxl')) {
		return { mxl: (await fixture.bytes()).toBase64() };
	}
	return { musicXML: await fixture.text() };
}

/* The width a fixture lays out to (8.5in unless the test overrides it). */
function referenceWidth(config: ConfigInput): number {
	return (
		(config.layout?.type === 'standard'
			? config.layout.referenceWidth
			: undefined) ?? DEFAULT_WIDTH
	);
}

/* Default both fonts to the families the Docker image installs as system fonts (see
 * Dockerfile). Passing a family with no URL takes the font loader's "already available"
 * path — the browser resolves it locally instead of fetching Bravura's woff2 or Source
 * Sans 3 from the Google Fonts CDN, so renders never touch the network. A test that
 * sets fonts.notation or fonts.text (spread last) overrides the default. */
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
