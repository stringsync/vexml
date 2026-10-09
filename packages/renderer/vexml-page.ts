import { MDOMParser } from '@stringsync/mdom';
import {
	type ConfigInput,
	EditingSession,
	insertGaps,
	readTimeline,
	render,
	type Score,
	SnapshotMismatchError,
} from '@stringsync/vexml';
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
	// The previous render's score, disposed before the next mounts.
	private score: Score | null = null;

	async mount(input: VexmlInput): Promise<VexmlContext> {
		const prior = document.getElementById('screenshot');
		if (!(prior instanceof HTMLDivElement)) {
			throw new Error('mount: #screenshot container not found');
		}
		// Tabs are pooled, so each render gets a fresh container: a reused one carries the
		// previous render's styles and scroll offset (a panoramic score scrolled to its end
		// opens the next one there), and its score's listeners keep firing.
		this.score?.dispose();
		this.score = null;
		const container = document.createElement('div');
		container.id = 'screenshot';
		prior.replaceWith(container);
		const source =
			input.mxl != null
				? new Blob([Uint8Array.fromBase64(input.mxl)])
				: (input.musicXML ?? '');
		const score = await render(source, container, input.config);
		this.score = score;
		return {
			score,
			container,
			render,
			insertGaps,
			readTimeline,
			MDOMParser,
			EditingSession,
			SnapshotMismatchError,
		};
	}
}

registerPage(new VexmlPage());
