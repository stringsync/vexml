import * as path from 'node:path';
import type { MDOMParser } from '@stringsync/mdom';
import type {
	ConfigInput,
	EditingSession,
	insertGaps,
	readTimeline,
	render,
	Score,
	SnapshotMismatchError,
} from '@stringsync/vexml';
import type { paint } from '@stringsync/vexml/paint';
import { BrowserRenderer } from './browser-renderer';
import { bundle } from './bundle';
import type { TabPool } from './pool';
import { tabPools } from './tab-pools';

/** What vexml exposes to eval fns: the live Score, the container it rendered into,
 * and the library entry itself (so a fn can drive a re-render, as the stage tests do). */
export interface VexmlContext {
	score: Score;
	container: HTMLDivElement;
	render: typeof render;
	paint: typeof paint;
	insertGaps: typeof insertGaps;
	readTimeline: typeof readTimeline;
	MDOMParser: typeof MDOMParser;
	EditingSession: typeof EditingSession;
	SnapshotMismatchError: typeof SnapshotMismatchError;
}

/** A score as MusicXML text or compressed .mxl bytes, plus the config to render with, and
 * the CPU slowdown to render under (see Tab.throttle; default full speed). */
export type VexmlInput = { config?: ConfigInput; cpuThrottle?: number } & (
	| { musicXML: string; mxl?: undefined }
	| { mxl: Uint8Array; musicXML?: undefined }
);

// The margin round every capture, for engravings that overshoot their box to land in. The
// reference renderers pad by it too, so their images come out the same size as vexml's.
export const PADDING = 16;

/* The tab shell every vexml render mounts into: vexml-page.ts's mount targets
 * #screenshot and the screenshots crop to it. inline-block shrinkwraps the div. */
const PAGE_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}#screenshot{padding:${PADDING}px;display:inline-block}</style></head><body><div id="screenshot"></div></body></html>`;

// ponytail: mirrors vexml's DEFAULT_WIDTH. The public API doesn't expose it, so this
// package doesn't get privileged access. Bump if vexml's default reference width ever
// exceeds this. The reference renderers draw at it too, so their scores line up with vexml's.
export const DEFAULT_WIDTH = 900;

// Viewport headroom over the reference width, so the #screenshot padding fits.
export const MARGIN = 64;

export class VexmlRenderer extends BrowserRenderer<VexmlContext> {
	constructor(private readonly input: VexmlInput) {
		super();
	}

	protected pool(): TabPool {
		return tabPools.pool('vexml', {
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

	protected override cpuThrottle(): number | null {
		return this.input.cpuThrottle ?? null;
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

let script: Promise<string> | null = null;
async function scripts(): Promise<string[]> {
	script ??= bundle(path.resolve(import.meta.dir, 'vexml-page.ts'));
	return [await script];
}
