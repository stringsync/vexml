import type { AlphatabApi, AlphatabContext } from './alphatab-renderer';
import { registerPage } from './page-registry';

/*
 * The browser side of the alphaTab renderer: bundled to a classic script and injected
 * after alphaTab's UMD build. mount draws SVG into #screenshot and keeps the
 * AlphatabContext eval fns run against.
 */

type AlphaTabWindow = {
	alphaTab: {
		AlphaTabApi: new (el: Element, settings: object) => AlphatabApi;
	};
};

registerPage(
	/** `musicXML` and `font` (the Bravura woff2) are both base64. */
	async (input: {
		musicXML: string;
		font: string;
	}): Promise<AlphatabContext> => {
		const { AlphaTabApi } = (window as unknown as AlphaTabWindow).alphaTab;
		const container = document.getElementById('screenshot');
		if (!(container instanceof HTMLDivElement)) {
			throw new Error('mount: #screenshot container not found');
		}
		container.replaceChildren();
		const alphatab = new AlphaTabApi(container, {
			core: {
				engine: 'svg',
				// Workers would need alphaTab's own script URL, which an injected script
				// doesn't give it.
				useWorkers: false,
				smuflFontSources: { woff2: `data:font/woff2;base64,${input.font}` },
			},
			player: { enablePlayer: false },
		});
		await new Promise<void>((resolve, reject) => {
			alphatab.renderFinished.on(resolve);
			alphatab.error.on(reject);
			if (!alphatab.load(Uint8Array.fromBase64(input.musicXML))) {
				reject(new Error('alphatab could not load the file'));
			}
		});
		return { alphatab, container };
	},
);
