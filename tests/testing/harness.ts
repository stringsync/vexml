import { afterAll, beforeAll } from 'bun:test';
import { type Browser, chromium } from 'playwright';
import type { Config } from '../../src';
import { DEFAULT_WIDTH } from '../../src/constants';
import { serve } from './serve';

const PORT = 3100;

let browser: Browser;
let server: ReturnType<typeof serve>;

// Importing this module registers the hooks against the importing test file.
beforeAll(async () => {
	server = serve(PORT);
	browser = await chromium.launch();
});

afterAll(async () => {
	await browser?.close();
	server?.stop(true);
});

// A fixture is laid out to its reference width (8.5in unless the test overrides it);
// the result scales to any container at runtime, so a static viewport exercises the
// layout deterministically.

/** Render a corpus file in the browser and return its screenshot PNG. */
export async function render(
	file: string,
	config: Partial<Config>,
): Promise<Buffer> {
	const width =
		(config.layout?.type === 'standard' ? config.layout.width : undefined) ??
		DEFAULT_WIDTH;
	const page = await browser.newPage({
		viewport: { width: width + 64, height: 600 },
	});
	try {
		await page.goto(`http://localhost:${PORT}/`);
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
