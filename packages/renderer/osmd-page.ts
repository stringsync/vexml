import type { OsmdApi, OsmdContext } from './osmd-renderer';
import { registerPage } from './page-registry';

/*
 * The browser side of the OSMD renderer: bundled to a classic script and injected
 * after OSMD's UMD build, which hangs opensheetmusicdisplay off the window. mount
 * draws SVG into #screenshot and keeps the OsmdContext eval fns run against.
 */

type OsmdWindow = {
	opensheetmusicdisplay: {
		OpenSheetMusicDisplay: new (el: HTMLElement, opts: object) => OsmdApi;
	};
};

registerPage(async (input: { musicXML: string }): Promise<OsmdContext> => {
	const { OpenSheetMusicDisplay } = (window as unknown as OsmdWindow)
		.opensheetmusicdisplay;
	const container = document.getElementById('screenshot');
	if (!(container instanceof HTMLDivElement)) {
		throw new Error('mount: #screenshot container not found');
	}
	container.replaceChildren();
	const osmd = new OpenSheetMusicDisplay(container, { autoResize: false });
	await osmd.load(input.musicXML);
	osmd.render();
	return { osmd, container };
});
