import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { bundle, PlaywrightBrowser } from '@vexml/browser';
import { PAGE_HTML, pageScript } from '@vexml/integration/pool';
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

// OSMD is a browser library, so this needs a page: its UMD build goes in from
// node_modules followed by osmd-page.ts, and it draws SVG into a fixed-width div.
async function renderWithOsmd(musicXML: string, output: string, log: Logger) {
	const browser = new PlaywrightBrowser();
	try {
		const tab = await browser.open({
			html: '<body style="margin:0;background:#fff"><div id="osmd" style="width:1064px"></div></body>',
			scripts: [
				readFileSync(
					'./node_modules/opensheetmusicdisplay/build/opensheetmusicdisplay.min.js',
					'utf8',
				),
				await bundle(resolve(import.meta.dir, 'osmd-page.ts')),
			],
			width: 1064,
			height: 600,
		});
		await tab.call('renderOsmd', musicXML);
		writeFileSync(output, await tab.screenshot('#osmd'));
		log.info(`wrote ${output}`);
	} finally {
		await browser.close();
	}
}

// Like OSMD, a browser library driven from a blank page: its UMD build followed by
// alphatab-page.ts, which takes the file and its Bravura webfont as base64.
async function renderWithAlphaTab(
	musicXML: string,
	output: string,
	log: Logger,
) {
	// Binary, so node:fs rather than Fs.
	const font = readFileSync(
		'./node_modules/@coderline/alphatab/dist/font/Bravura.woff2',
	).toBase64();

	const browser = new PlaywrightBrowser();
	try {
		const tab = await browser.open({
			html: '<body style="margin:0;background:#fff"><div id="alphatab" style="width:1064px"></div></body>',
			scripts: [
				readFileSync(
					'./node_modules/@coderline/alphatab/dist/alphaTab.min.js',
					'utf8',
				),
				await bundle(resolve(import.meta.dir, 'alphatab-page.ts')),
			],
			width: 1064,
			height: 600,
		});
		await tab.call('renderAlphaTab', {
			musicXML: Buffer.from(musicXML).toBase64(),
			font,
		});
		writeFileSync(output, await tab.screenshot('#alphatab'));
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
