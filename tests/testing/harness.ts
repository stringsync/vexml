import { afterAll, beforeAll } from 'bun:test';
import { type Browser, chromium } from 'playwright';
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

// Every fixture is laid out to one reference width; the SVG viewBox scales the
// result to any container at runtime, so a single static width exercises the
// layout deterministically.
const WIDTH = 1000;

/** Render a corpus file in the browser and return its screenshot PNG. */
export async function render(file: string): Promise<Buffer> {
	const page = await browser.newPage({
		viewport: { width: WIDTH + 64, height: 600 },
	});
	try {
		await page.goto(`http://localhost:${PORT}/`);
		await page.evaluate(
			async ({ file, width }) => {
				const res = await fetch(`/data/${file}`);
				const input = file.endsWith('.mxl')
					? await res.blob()
					: await res.text();
				const element = document.getElementById('vexml');
				if (!element) {
					throw new Error('element not found');
				}
				await window.render(input, element, { config: { WIDTH: width } });
			},
			{ file, width: WIDTH },
		);
		return await page.locator('#screenshot').screenshot();
	} finally {
		await page.close();
	}
}
