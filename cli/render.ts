import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { chromium } from 'playwright';
import { serve } from '../tests/testing/serve';
import { run } from './run';

// Same browser-render path as the test harness, but fed an arbitrary file
// instead of a corpus fixture. VexFlow needs the DOM, so there's no headless
// shortcut — reuse the page that already exposes window.render.
export async function render(opts: {
	input: string;
	output?: string;
	config?: string;
	musescore?: boolean;
	osmd?: boolean;
	cwd: string;
}) {
	// index.ts chdir'd to the repo root, so resolve user paths against their cwd.
	const at = (p: string) => (isAbsolute(p) ? p : resolve(opts.cwd, p));

	// A reference render, for checking vexml against when the correct engraving
	// is unclear. Shares nothing with the browser path but "MusicXML in, PNG out".
	if (opts.musescore) {
		const output = at(opts.output ?? `musescore ${timestamp()}.png`);
		await run('./musescore/render.sh', [at(opts.input), output]);
		return;
	}

	// The other reference renderer. Also VexFlow-based, so it agrees with vexml
	// on glyphs and disagrees on layout — the complement to MuseScore's opinion.
	if (opts.osmd) {
		const output = at(opts.output ?? `osmd ${timestamp()}.png`);
		await renderWithOsmd(readFileSync(at(opts.input), 'utf8'), output);
		return;
	}

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
				const container = document.getElementById('screenshot');
				if (!(container instanceof HTMLDivElement)) {
					throw new Error('container not found');
				}
				await window.render(musicXML, container, config);
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

// OSMD is a browser library, so this needs a page but no server: the UMD build
// goes straight in from node_modules and draws SVG into a fixed-width div.
async function renderWithOsmd(musicXML: string, output: string) {
	type OsmdWindow = {
		opensheetmusicdisplay: {
			OpenSheetMusicDisplay: new (
				id: string,
				opts: object,
			) => { load(xml: string): Promise<void>; render(): void };
		};
	};

	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({
			viewport: { width: 1064, height: 600 },
		});
		await page.setContent(
			'<body style="margin:0;background:#fff"><div id="osmd" style="width:1064px"></div></body>',
		);
		await page.addScriptTag({
			path: './node_modules/opensheetmusicdisplay/build/opensheetmusicdisplay.min.js',
		});
		await page.evaluate(async (musicXML) => {
			const { OpenSheetMusicDisplay } = (window as unknown as OsmdWindow)
				.opensheetmusicdisplay;
			const osmd = new OpenSheetMusicDisplay('osmd', { autoResize: false });
			await osmd.load(musicXML);
			osmd.render();
		}, musicXML);
		writeFileSync(output, await page.locator('#osmd').screenshot());
		console.log(`wrote ${output}`);
	} finally {
		await browser.close();
	}
}

// "YYYY-MM-DD HH.MM.SS" in local time.
function timestamp(): string {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
}
