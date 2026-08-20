import {
	type ConfigInput,
	render as renderScore,
	type Score,
} from '@stringsync/vexml';
import * as probes from './probes';

/*
 * The browser side of the harness: bundled into a classic script (pool.ts's
 * pageScript()) and injected into every tab the pool opens — and into the tab `vex
 * render` opens. It registers the two functions Tab.call reaches: `render` mounts a
 * score into #screenshot, `probe` runs a named probe from probes.ts against it. The
 * Score/container pair lives here between the calls, because only cloneable data
 * crosses the process boundary.
 */

let current: { score: Score; container: HTMLDivElement } | null = null;

Object.assign(globalThis, {
	async render(input: {
		musicXML?: string;
		/** A compressed .mxl file's bytes, base64. */
		mxl?: string;
		config?: ConfigInput;
	}): Promise<void> {
		const container = document.getElementById('screenshot');
		if (!(container instanceof HTMLDivElement)) {
			throw new Error('render: #screenshot container not found');
		}
		container.replaceChildren();
		// Tabs are pooled, so a style the previous test set would carry into this one.
		container.removeAttribute('style');
		const source =
			input.mxl != null
				? new Blob([Uint8Array.fromBase64(input.mxl)])
				: (input.musicXML ?? '');
		current = {
			score: await renderScore(source, container, input.config),
			container,
		};
	},

	async probe(input: { name: string; arg?: unknown }): Promise<unknown> {
		if (!current) {
			throw new Error(`probe ${input.name}: nothing rendered yet`);
		}
		const probe = (probes as Record<string, unknown>)[input.name];
		if (typeof probe !== 'function') {
			throw new Error(`probe: no probe named '${input.name}' in probes.ts`);
		}
		return await probe(current.score, current.container, input.arg);
	},
});
