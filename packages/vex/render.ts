import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { PlaywrightBrowser } from '@vexml/browser';
import { PAGE_HTML, pageScript } from '@vexml/integration/pool';
import { chromium } from 'playwright';
import type { Logger } from 'webappwiz/log';
import type { Fs, Ps } from 'webappwiz/system';

// Same browser-render path as the integration tests, but fed an arbitrary file
// instead of a corpus fixture. VexFlow needs the DOM, so there's no headless
// shortcut — reuse the page the tests render through.
export async function render(opts: {
	input: string;
	output?: string;
	config?: string;
	muse?: boolean;
	osmd?: boolean;
	alpha?: boolean;
	cwd: string;
	log: Logger;
	fs: Fs;
	ps: Ps;
}) {
	// index.ts chdir'd to the repo root, so resolve user paths against their cwd.
	const at = (p: string) => (isAbsolute(p) ? p : resolve(opts.cwd, p));

	// A reference render, for checking vexml against when the correct engraving
	// is unclear. Shares nothing with the browser path but "MusicXML in, PNG out".
	if (opts.muse) {
		const output = at(opts.output ?? `musescore ${timestamp()}.png`);
		const { exitCode } = await opts.ps.spawn([
			'./packages/vex/musescore/render.sh',
			at(opts.input),
			output,
		]);
		if (exitCode !== 0) {
			throw new Error('musescore render failed');
		}
		return;
	}

	// The other reference renderer. Also VexFlow-based, so it agrees with vexml
	// on glyphs and disagrees on layout — the complement to MuseScore's opinion.
	if (opts.osmd) {
		const output = at(opts.output ?? `osmd ${timestamp()}.png`);
		await renderWithOsmd(await opts.fs.read(at(opts.input)), output, opts.log);
		return;
	}

	// The third reference renderer, and the only one that isn't VexFlow or
	// MuseScore — useful for guitar tab, where it's the strongest of the three.
	if (opts.alpha) {
		const output = at(opts.output ?? `alphatab ${timestamp()}.png`);
		await renderWithAlphaTab(
			await opts.fs.read(at(opts.input)),
			output,
			opts.log,
		);
		return;
	}

	const musicXML = await opts.fs.read(at(opts.input));
	const output = at(opts.output ?? `vexml ${timestamp()}.png`);
	// Passed straight to window.render as a Partial<Config>; render fills the rest
	// from DEFAULT_CONFIG, so this knows nothing about config's shape.
	const config = opts.config ? JSON.parse(opts.config) : {};

	// The same page the integration tests render through, injected instead of served:
	// the tab needs no server and no ports at all.
	const browser = new PlaywrightBrowser();
	try {
		const tab = await browser.open({
			html: PAGE_HTML,
			scripts: [await pageScript()],
			width: 1064,
			height: 600,
		});
		await tab.call('render', { musicXML, config });
		// Fs is text-only, so a PNG goes out through node:fs.
		writeFileSync(output, await tab.screenshot('#screenshot'));
		opts.log.info(`wrote ${output}`);
	} finally {
		await browser.close();
	}
}

// OSMD is a browser library, so this needs a page but no server: the UMD build
// goes straight in from node_modules and draws SVG into a fixed-width div.
async function renderWithOsmd(musicXML: string, output: string, log: Logger) {
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
		log.info(`wrote ${output}`);
	} finally {
		await browser.close();
	}
}

// Like OSMD, a browser library driven from a blank page. Unlike OSMD, it draws
// with its own Bravura webfont, which it fetches by URL — so the font goes in
// as a data URL rather than standing up a server just to serve one file.
async function renderWithAlphaTab(
	musicXML: string,
	output: string,
	log: Logger,
) {
	type AlphaTabWindow = {
		alphaTab: {
			AlphaTabApi: new (
				el: Element,
				settings: object,
			) => {
				renderFinished: { on(handler: () => void): void };
				error: { on(handler: (e: Error) => void): void };
				load(data: Uint8Array): boolean;
			};
		};
	};

	// Binary, so node:fs rather than Fs.
	const font = readFileSync(
		'./node_modules/@coderline/alphatab/dist/font/Bravura.woff2',
	).toBase64();

	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({
			viewport: { width: 1064, height: 600 },
		});
		await page.setContent(
			'<body style="margin:0;background:#fff"><div id="alphatab" style="width:1064px"></div></body>',
		);
		await page.addScriptTag({
			path: './node_modules/@coderline/alphatab/dist/alphaTab.min.js',
		});
		await page.evaluate(
			async ({ musicXML, font }) => {
				const { AlphaTabApi } = (window as unknown as AlphaTabWindow).alphaTab;
				const container = document.getElementById('alphatab');
				if (!container) {
					throw new Error('container not found');
				}
				const api = new AlphaTabApi(container, {
					core: {
						engine: 'svg',
						// Workers would need alphaTab's own script URL, which a script
						// tag injected from disk doesn't give it.
						useWorkers: false,
						smuflFontSources: { woff2: `data:font/woff2;base64,${font}` },
					},
					player: { enablePlayer: false },
				});
				await new Promise<void>((resolve, reject) => {
					api.renderFinished.on(resolve);
					api.error.on(reject);
					if (!api.load(Uint8Array.fromBase64(musicXML))) {
						reject(new Error('alphatab could not load the file'));
					}
				});
			},
			{ musicXML: Buffer.from(musicXML).toBase64(), font },
		);
		writeFileSync(output, await page.locator('#alphatab').screenshot());
		log.info(`wrote ${output}`);
	} finally {
		await browser.close();
	}
}

function timestamp(): string {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
}
