import * as path from 'node:path';
import { BrowserRenderer } from './browser-renderer';
import { bundle } from './bundle';
import { pool, type TabPool } from './pool';

export interface OsmdInput {
	musicXML: string;
}

/** The slice of OSMD's api the page keeps. Deliberately minimal: the repo drives OSMD
 * as a reference renderer for second opinions, not as a library under test. */
export interface OsmdApi {
	load(musicXML: string): Promise<void>;
	render(): void;
}

/** What OSMD exposes to eval fns. */
export interface OsmdContext {
	osmd: OsmdApi;
	container: HTMLDivElement;
}

// OSMD draws SVG into a fixed-width div; white so the PNG isn't transparent.
const PAGE_HTML =
	'<body style="margin:0;background:#fff"><div id="screenshot" style="width:1064px"></div></body>';

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

export class OsmdRenderer extends BrowserRenderer<OsmdContext> {
	constructor(private readonly input: OsmdInput) {
		super();
	}

	protected pool(): TabPool {
		return pool('osmd', { html: PAGE_HTML, scripts, width: 1064, height: 600 });
	}

	protected mountInput(): unknown {
		return { musicXML: this.input.musicXML };
	}
}
