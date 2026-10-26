import type { OsmdApi, OsmdContext } from './osmd-renderer';
import { type EnginePage, registerPage } from './page-registry';
import { SvgInkMasks } from './svg-ink-masks';

/*
 * The browser side of the OSMD renderer: bundled to a classic script and injected
 * after OSMD's UMD build, which hangs opensheetmusicdisplay off the window. mount
 * draws SVG into #score and keeps the OsmdContext eval fns run against.
 */

type OsmdWindow = {
	opensheetmusicdisplay: {
		OpenSheetMusicDisplay: new (el: HTMLElement, opts: object) => OsmdApi;
	};
};

class OsmdPage implements EnginePage<{ musicXML: string }, OsmdContext> {
	async mount(input: { musicXML: string }): Promise<OsmdContext> {
		const { OpenSheetMusicDisplay } = (window as unknown as OsmdWindow)
			.opensheetmusicdisplay;
		const container = document.getElementById('score');
		if (!(container instanceof HTMLDivElement)) {
			throw new Error('mount: #score container not found');
		}
		container.replaceChildren();
		const osmd = new OpenSheetMusicDisplay(container, {
			autoResize: false,
			// Laid out the way vexml lays out by default, so the two sit side by side as one
			// score: the document's own system breaks kept, a ragged last system left ragged,
			// numbers only where a system starts, and none of the header vexml never draws.
			newSystemFromXML: true,
			newSystemFromNewPageInXML: true,
			drawMeasureNumbersOnlyAtSystemStart: true,
			drawTitle: false,
			drawSubtitle: false,
			drawComposer: false,
			drawLyricist: false,
			drawCredits: false,
			drawPartNames: false,
		});
		await osmd.load(input.musicXML);
		osmd.render();
		return {
			osmd,
			container,
			inkMasks: () => new SvgInkMasks(container).capture(),
		};
	}
}

registerPage(new OsmdPage());
