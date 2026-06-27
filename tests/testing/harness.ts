import { afterAll, beforeAll } from 'bun:test';
import { type Browser, chromium } from 'playwright';
import type { Config } from '../../src';
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

// A fixture is laid out to its reference width (default 1000); the SVG viewBox
// scales the result to any container at runtime, so a single static width
// exercises the layout deterministically.
const DEFAULT_WIDTH = 1000;

/** Render a corpus file in the browser and return its screenshot PNG. */
export async function render(
	file: string,
	config: Partial<Config>,
): Promise<Buffer> {
	const width =
		config.layout?.type === 'standard' ? config.layout.width : DEFAULT_WIDTH;
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
				const canvas = document.getElementById('vexml');
				if (!(canvas instanceof HTMLCanvasElement)) {
					throw new Error('canvas not found');
				}
				await window.render(input, canvas, config);
			},
			{ file, config },
		);
		return await page.locator('#screenshot').screenshot();
	} finally {
		await page.close();
	}
}
