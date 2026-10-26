import * as path from 'node:path';
import { BrowserRenderer } from './browser-renderer';
import { bundle } from './bundle';
import type { InkMask } from './ink-mask';
import type { TabPool } from './pool';
import { tabPools } from './tab-pools';
import { DEFAULT_WIDTH, MARGIN, PADDING } from './vexml-renderer';

export interface OsmdInput {
	musicXML: string;
}

/** The OSMD calls an eval fn can make through OsmdContext.osmd. */
export interface OsmdApi {
	// Deliberately minimal: the repo drives OSMD as a reference renderer for second
	// opinions, not as a library under test.
	load(musicXML: string): Promise<void>;
	render(): void;
}

/** What OSMD exposes to eval fns. */
export interface OsmdContext {
	osmd: OsmdApi;
	inkMasks(): Promise<InkMask[]>;
	container: HTMLDivElement;
}

// OSMD draws SVG into #score, a fixed-width div as wide as vexml lays out to. The capture
// is #screenshot round it, padded as vexml's is: padding on #score itself could widen what
// OSMD lays out to. White so the PNG isn't transparent.
const PAGE_HTML = `<body style="margin:0;background:#fff"><div id="screenshot" style="padding:${PADDING}px;display:inline-block"><div id="score" style="width:${DEFAULT_WIDTH}px"></div></div></body>`;

export class OsmdRenderer extends BrowserRenderer<OsmdContext> {
	constructor(private readonly input: OsmdInput) {
		super();
	}

	protected pool(): TabPool {
		return tabPools.pool('osmd', {
			html: PAGE_HTML,
			scripts,
			width: DEFAULT_WIDTH + MARGIN,
			height: 600,
		});
	}

	protected mountInput(): unknown {
		return { musicXML: this.input.musicXML };
	}
}

let script: Promise<string[]> | null = null;
function scripts(): Promise<string[]> {
	// OSMD's UMD build hangs the library off the window; osmd-page.ts reaches it there.
	script ??= Promise.all([
		Bun.file(
			Bun.resolveSync(
				'opensheetmusicdisplay/build/opensheetmusicdisplay.min.js',
				import.meta.dir,
			),
		).text(),
		bundle(path.resolve(import.meta.dir, 'osmd-page.ts')),
	]);
	return script;
}
