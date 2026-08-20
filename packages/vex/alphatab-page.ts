/*
 * The browser side of `vex render --alpha`: bundled to an IIFE and injected after
 * alphaTab's UMD build. Unlike OSMD, alphaTab draws with its own Bravura webfont, which
 * it fetches by URL — so the font comes in with the call as a data URL rather than
 * standing up a server just to serve one file.
 */

type AlphaTabWindow = {
	alphaTab: {
		AlphaTabApi: new (
			el: Element,
			settings: object,
		) => {
			renderFinished: { on(handler: () => void): void };
			error: { on(handler: (e: Error) => void): void };
			load(data: Uint8Array): boolean;
		};
	};
};

Object.assign(globalThis, {
	/** `musicXML` and `font` (the Bravura woff2) are both base64. */
	async renderAlphaTab(input: {
		musicXML: string;
		font: string;
	}): Promise<void> {
		const { AlphaTabApi } = (window as unknown as AlphaTabWindow).alphaTab;
		const container = document.getElementById('alphatab');
		if (!container) {
			throw new Error('container not found');
		}
		const api = new AlphaTabApi(container, {
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
			api.renderFinished.on(resolve);
			api.error.on(reject);
			if (!api.load(Uint8Array.fromBase64(input.musicXML))) {
				reject(new Error('alphatab could not load the file'));
			}
		});
	},
});
