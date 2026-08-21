import {
	type ConfigInput,
	render as renderScore,
	type Score,
} from '@stringsync/vexml';

/*
 * The browser side of the ScoreBrowser: bundled into a classic script (pool.ts's
 * pageScript()) and injected into every tab the pool opens — and into the tab `vex
 * render` opens. It registers the two functions Tab.call reaches: `mount` renders a
 * score into #screenshot, `probe` runs a test's fn against it. The Score/container pair
 * lives here between the calls, because only cloneable data crosses the process
 * boundary.
 */

// The raw library entry, for the rare test fn that renders again itself (see
// stage.test.ts). Everything else mounts through `mount`.
declare global {
	interface Window {
		render: typeof renderScore;
	}
}
window.render = renderScore;

let current: { score: Score; container: HTMLDivElement } | null = null;

Object.assign(globalThis, {
	async mount(input: {
		musicXML?: string;
		/** A compressed .mxl file's bytes, base64. */
		mxl?: string;
		config?: ConfigInput;
	}): Promise<void> {
		const container = document.getElementById('screenshot');
		if (!(container instanceof HTMLDivElement)) {
			throw new Error('mount: #screenshot container not found');
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

	async probe(input: { fnSrc: string; arg?: unknown }): Promise<unknown> {
		if (!current) {
			throw new Error('probe: nothing mounted yet');
		}
		// Rehydrate the test's fn; it crossed the boundary as source text (see BrowserFn
		// in score-browser.ts for the contract that makes that legal).
		const fn = new Function(`return (${input.fnSrc})`)();
		return await fn(current.score, current.container, input.arg);
	},
});
