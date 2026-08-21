import * as path from 'node:path';
import { BrowserRenderer } from './browser-renderer';
import { bundle } from './bundle';
import { pool, type TabPool } from './pool';

export interface AlphatabInput {
	musicXML: string;
}

/** The slice of alphaTab's api the page keeps. Deliberately minimal: the repo drives
 * alphaTab as a reference renderer for second opinions, not as a library under test. */
export interface AlphatabApi {
	renderFinished: { on(handler: () => void): void };
	error: { on(handler: (e: Error) => void): void };
	load(data: Uint8Array): boolean;
}

/** What alphaTab exposes to eval fns. */
export interface AlphatabContext {
	alphatab: AlphatabApi;
	container: HTMLDivElement;
}

// alphaTab draws SVG into a fixed-width div; white so the PNG isn't transparent.
const PAGE_HTML =
	'<body style="margin:0;background:#fff"><div id="screenshot" style="width:1064px"></div></body>';

// alphaTab's exports map hides its dist/ subpaths, so resolve the package's main
// entry (dist/alphaTab.js) and reach its siblings from there.
function dist(...segments: string[]): string {
	return path.join(
		path.dirname(Bun.resolveSync('@coderline/alphatab', import.meta.dir)),
		...segments,
	);
}

let script: Promise<string[]> | null = null;
function scripts(): Promise<string[]> {
	// alphaTab's UMD build hangs the library off the window; alphatab-page.ts reaches
	// it there.
	script ??= Promise.all([
		Bun.file(dist('alphaTab.min.js')).text(),
		bundle(path.resolve(import.meta.dir, 'alphatab-page.ts')),
	]);
	return script;
}

// alphaTab draws with its own Bravura webfont, which it fetches by URL — so the font
// crosses with the mount as a data URL rather than standing up a server for one file.
let font: Promise<string> | null = null;
function fontBase64(): Promise<string> {
	font ??= Bun.file(dist('font', 'Bravura.woff2'))
		.bytes()
		.then((bytes) => bytes.toBase64());
	return font;
}

export class AlphatabRenderer extends BrowserRenderer<AlphatabContext> {
	constructor(private readonly input: AlphatabInput) {
		super();
	}

	protected pool(): TabPool {
		return pool('alphatab', {
			html: PAGE_HTML,
			scripts,
			width: 1064,
			height: 600,
		});
	}

	protected async mountInput(): Promise<unknown> {
		return {
			musicXML: Buffer.from(this.input.musicXML).toBase64(),
			font: await fontBase64(),
		};
	}
}
