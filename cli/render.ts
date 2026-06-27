import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { chromium } from 'playwright';
import { serve } from '../tests/testing/serve';

// Same browser-render path as the test harness, but fed an arbitrary file
// instead of a corpus fixture. VexFlow needs the DOM, so there's no headless
// shortcut — reuse the page that already exposes window.render.
export async function render(opts: {
	input: string;
	output?: string;
	config?: string;
	cwd: string;
}) {
	// index.ts chdir'd to the repo root, so resolve user paths against their cwd.
	const at = (p: string) => (isAbsolute(p) ? p : resolve(opts.cwd, p));
	const musicXML = readFileSync(at(opts.input), 'utf8');
	const output = at(opts.output ?? `vexml ${timestamp()}.png`);
	// Passed straight to window.render as a Partial<Config>; render fills the rest
	// from DEFAULT_CONFIG, so this knows nothing about config's shape.
	const config = opts.config ? JSON.parse(opts.config) : {};

	const server = serve(3101);
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({
			viewport: { width: 1064, height: 600 },
		});
		await page.goto('http://localhost:3101/');
		await page.evaluate(
			async ({ musicXML, config }) => {
				const canvas = document.getElementById('vexml');
				if (!(canvas instanceof HTMLCanvasElement)) {
					throw new Error('canvas not found');
				}
				await window.render(musicXML, canvas, config);
			},
			{ musicXML, config },
		);
		const buf = await page.locator('#screenshot').screenshot();
		writeFileSync(output, buf);
		console.log(`wrote ${output}`);
	} finally {
		await browser.close();
		server.stop(true);
	}
}

// "YYYY-MM-DD HH.MM.SS" in local time.
function timestamp(): string {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
}
