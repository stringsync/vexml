import type { Config } from '../../src';
import { DEFAULT_WIDTH } from '../../src/constants';
import { TEST_URL, testBrowser } from './setup';

// A fixture is laid out to its reference width (8.5in unless the test overrides it);
// the result scales to any container at runtime, so a static viewport exercises the
// layout deterministically. The browser and page server are shared across the whole run
// (see setup.ts) — launching a second Chromium per file is flaky in Docker.

/** Render a corpus file in the browser and return its screenshot PNG. */
export async function render(
	file: string,
	config: Partial<Config>,
): Promise<Buffer> {
	const width =
		(config.layout?.type === 'standard' ? config.layout.width : undefined) ??
		DEFAULT_WIDTH;
	const browser = await testBrowser();
	const page = await browser.newPage({
		viewport: { width: width + 64, height: 600 },
	});
	try {
		await page.goto(TEST_URL);
		await page.evaluate(
			async ({ file, config }) => {
				const res = await fetch(`/data/${file}`);
				const input = file.endsWith('.mxl')
					? await res.blob()
					: await res.text();
				const container = document.getElementById('screenshot');
				if (!(container instanceof HTMLDivElement)) {
					throw new Error('container not found');
				}
				await window.render(input, container, config);
			},
			{ file, config },
		);
		return await page.locator('#screenshot').screenshot();
	} finally {
		await page.close();
	}
}
