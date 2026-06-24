import { afterAll, beforeAll } from 'bun:test';
import { type Browser, chromium } from 'playwright';
import { startServer } from './serve';

const PORT = 3100;

let browser: Browser;
let server: ReturnType<typeof startServer>;

// Importing this module registers the hooks against the importing test file.
beforeAll(async () => {
	server = startServer(PORT);
	browser = await chromium.launch();
});

afterAll(async () => {
	await browser?.close();
	server?.stop(true);
});

export type RenderOptions = {
	width: number;
	config?: Record<string, unknown>;
};

/** Render a corpus file in the browser and return its screenshot PNG. */
export async function render(
	file: string,
	opts: RenderOptions,
): Promise<Buffer> {
	const page = await browser.newPage({
		viewport: { width: opts.width, height: 600 },
	});
	try {
		await page.goto(`http://localhost:${PORT}/`);
		await page.evaluate(
			async ({ file, width, config }) => {
				const res = await fetch(`/data/${file}`);
				const input = file.endsWith('.mxl')
					? await res.blob()
					: await res.text();
				const element = document.getElementById('vexml');
				if (!element) {
					throw new Error('element not found');
				}
				await window.render(input, element, {
					config: { WIDTH: width, ...config },
				});
			},
			{ file, width: opts.width, config: opts.config ?? {} },
		);
		return await page.locator('#screenshot').screenshot();
	} finally {
		await page.close();
	}
}
