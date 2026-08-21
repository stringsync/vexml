import * as path from 'node:path';
import type { ConfigInput, render, Score } from '@stringsync/vexml';
import { BrowserRenderer } from './browser-renderer';
import { bundle } from './bundle';
import { pool, type TabPool } from './pool';

/** What vexml exposes to eval fns: the live Score, the container it rendered into,
 * and the library entry itself (so a fn can drive a re-render, as the stage tests do). */
export interface VexmlContext {
	score: Score;
	container: HTMLDivElement;
	render: typeof render;
}

/** A score as MusicXML text or compressed .mxl bytes, plus the config to render with. */
export type VexmlInput = { config?: ConfigInput } & (
	| { musicXML: string; mxl?: undefined }
	| { mxl: Uint8Array; musicXML?: undefined }
);

/* The tab shell every vexml render mounts into: vexml-page.ts's mount targets
 * #screenshot and the screenshots crop to it. The padding gives engravings that
 * overshoot their box a margin to land in; inline-block shrinkwraps the div. */
const PAGE_HTML =
	'<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}#screenshot{padding:16px;display:inline-block}</style></head><body><div id="screenshot"></div></body></html>';

// ponytail: mirrors vexml's DEFAULT_WIDTH — the public API doesn't expose it, so this
// package doesn't get privileged access. Bump if vexml's default reference width ever
// exceeds this.
const DEFAULT_WIDTH = 900;

// Viewport headroom over the reference width, so the #screenshot padding fits.
const MARGIN = 64;

let script: Promise<string> | null = null;
async function scripts(): Promise<string[]> {
	script ??= bundle(path.resolve(import.meta.dir, 'vexml-page.ts'));
	return [await script];
}

export class VexmlRenderer extends BrowserRenderer<VexmlContext> {
	constructor(private readonly input: VexmlInput) {
		super();
	}

	protected pool(): TabPool {
		return pool('vexml', {
			html: PAGE_HTML,
			scripts,
			width: DEFAULT_WIDTH + MARGIN,
			height: 600,
		});
	}

	/* A score is laid out to its reference width; the result scales to any container at
	 * runtime, so a static viewport exercises the layout deterministically. */
	protected override viewport(): { width: number; height: number } {
		return { width: this.referenceWidth() + MARGIN, height: 600 };
	}

	protected mountInput(): unknown {
		const { config } = this.input;
		// .mxl bytes cross as base64; vexml-page.ts rehydrates them into a Blob.
		return this.input.mxl != null
			? { mxl: this.input.mxl.toBase64(), config }
			: { musicXML: this.input.musicXML, config };
	}

	/* The width the score lays out to (8.5in unless the config overrides it). */
	private referenceWidth(): number {
		const layout = this.input.config?.layout;
		return (
			(layout?.type === 'standard' ? layout.referenceWidth : undefined) ??
			DEFAULT_WIDTH
		);
	}
}
