/*
 * The browser side of `vex render --osmd`: bundled to an IIFE and injected after OSMD's
 * UMD build, which hangs opensheetmusicdisplay off the window. Draws SVG into the #osmd
 * div the shell HTML provides.
 */

type OsmdWindow = {
	opensheetmusicdisplay: {
		OpenSheetMusicDisplay: new (
			id: string,
			opts: object,
		) => { load(xml: string): Promise<void>; render(): void };
	};
};

Object.assign(globalThis, {
	async renderOsmd(musicXML: string): Promise<void> {
		const { OpenSheetMusicDisplay } = (window as unknown as OsmdWindow)
			.opensheetmusicdisplay;
		const osmd = new OpenSheetMusicDisplay('osmd', { autoResize: false });
		await osmd.load(musicXML);
		osmd.render();
	},
});
