import * as path from 'node:path';
import type { ConfigInput, Score } from '@stringsync/vexml';
import { TabPool } from './pool';

const DATA_DIR = path.resolve(import.meta.dir, './__data__');

// ponytail: mirrors vexml's DEFAULT_WIDTH — the public API doesn't expose it, so tests
// don't get privileged access. Bump if vexml's default reference width ever exceeds this.
const DEFAULT_WIDTH = 900;

/**
 * Renders corpus files for tests. The infrastructure — the browser, the pooled tabs
 * loaded with page.ts — lives in the TabPool (see pool.ts); this class only turns a
 * fixture + config into a screenshot and/or a value computed against the live Score.
 * Tests use the shared `renderer` instance below; setup.ts starts and closes it around
 * the run.
 */
export class Renderer {
	constructor(private readonly pool = new TabPool()) {}

	start(): Promise<void> {
		return this.pool.start();
	}

	close(): Promise<void> {
		return this.pool.close();
	}

	/** Render a corpus file in the browser and return its screenshot PNG. */
	async screenshot(file: string, config: ConfigInput = {}): Promise<Buffer> {
		return (await this.render(file, config)).png;
	}

	/**
	 * Render a corpus file on a pooled tab, run `opts.fn` against the live Score in the
	 * browser, and screenshot the container. Tests that only want pixels use
	 * screenshot(); tests that only want data ignore `png`.
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
		return this.pool.withTab(async (tab) => {
			await tab.resize(this.referenceWidth(config) + 64, 600);
			await tab.call('mount', {
				...(await this.input(file)),
				config: this.withDefaultFonts(config),
			});
			const result = (
				opts.fn
					? await tab.call<unknown>('probe', {
							fnSrc: opts.fn.toString(),
							arg: opts.arg,
						})
					: undefined
			) as T;
			const png = await tab.screenshot('#screenshot');
			return { result, png };
		});
	}

	/** A fixture's content, keyed the way page.ts's mount expects it: text for MusicXML,
	 * base64 bytes for compressed .mxl. */
	private async input(
		file: string,
	): Promise<{ musicXML: string } | { mxl: string }> {
		const fixture = Bun.file(path.join(DATA_DIR, file));
		if (file.endsWith('.mxl')) {
			return { mxl: (await fixture.bytes()).toBase64() };
		}
		return { musicXML: await fixture.text() };
	}

	/* The width a fixture lays out to (8.5in unless the test overrides it). */
	private referenceWidth(config: ConfigInput): number {
		return (
			(config.layout?.type === 'standard'
				? config.layout.referenceWidth
				: undefined) ?? DEFAULT_WIDTH
		);
	}

	/* Default both fonts to the families the Docker image installs as system fonts (see
	 * Dockerfile). Passing a family with no URL takes the font loader's "already
	 * available" path — the browser resolves it locally instead of fetching Bravura's
	 * woff2 or Source Sans 3 from the Google Fonts CDN, so renders never touch the
	 * network. A test that sets fonts.notation or fonts.text (spread last) overrides the
	 * default. */
	private withDefaultFonts(config: ConfigInput): ConfigInput {
		return {
			...config,
			fonts: {
				notation: { family: 'Bravura' },
				text: { family: 'Source Sans 3' },
				...config.fonts,
			},
		};
	}
}

/** The shared instance every test renders through. */
export const renderer = new Renderer();

/** A corpus fixture's text — for the rare test that feeds one to its fn via `arg`. */
export function fixture(file: string): Promise<string> {
	return Bun.file(path.join(DATA_DIR, file)).text();
}

/**
 * A test's browser-side function. It crosses into the page as source text (toString),
 * so it must be self-contained: no closing over test-scope variables — thread values
 * through `arg` (which must be structured-cloneable) instead. A module-level function
 * in a test file serializes the same way, so it can be passed AS `fn` — but an fn
 * cannot call one (that would be a closure). Besides the Score, the page offers only
 * `window.render`.
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
