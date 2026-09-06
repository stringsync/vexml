import { MDOMParser } from '@stringsync/mdom';
import { type ConfigInput, EditingSession, render } from '@stringsync/vexml';
import { type EnginePage, registerPage } from './page-registry';
import type { VexmlContext } from './vexml-renderer';

/*
 * The browser side of the vexml renderer: bundled to a classic script (see
 * VexmlRenderer's scripts()) and injected into every tab the vexml pool opens. mount
 * renders into #screenshot and keeps the VexmlContext eval fns run against.
 */

type VexmlInput = {
	musicXML?: string;
	/** A compressed .mxl file's bytes, base64. */
	mxl?: string;
	config?: ConfigInput;
};

class VexmlPage implements EnginePage<VexmlInput, VexmlContext> {
	async mount(input: VexmlInput): Promise<VexmlContext> {
		const container = document.getElementById('screenshot');
		if (!(container instanceof HTMLDivElement)) {
			throw new Error('mount: #screenshot container not found');
		}
		container.replaceChildren();
		// Tabs are pooled, so a style a previous render's eval set would carry into
		// this one.
		container.removeAttribute('style');
		const source =
			input.mxl != null
				? new Blob([Uint8Array.fromBase64(input.mxl)])
				: (input.musicXML ?? '');
		const score = await render(source, container, input.config);
		return { score, container, render, MDOMParser, EditingSession };
	}
}

registerPage(new VexmlPage());
