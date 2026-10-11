import type { AlphatabApi, AlphatabContext } from './alphatab-renderer';
import { type EnginePage, registerPage } from './page-registry';

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

/** `musicXML` and `font` (the Bravura woff2) are both base64. */
type AlphatabInput = {
	musicXML: string;
	font: string;
};

class AlphatabPage implements EnginePage<AlphatabInput, AlphatabContext> {
	async mount(input: AlphatabInput): Promise<AlphatabContext> {
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
				// Lazy loading draws each part of the score as it scrolls into view, after
				// renderFinished, which then only means laid out: the capture would get an empty
				// page the height of the score. Off, renderFinished means drawn.
				enableLazyLoading: false,
				smuflFontSources: { woff2: `data:font/woff2;base64,${input.font}` },
			},
			player: { enablePlayer: false },
		});
		await new Promise<void>((resolve, reject) => {
			alphatab.renderFinished.on(resolve);
			alphatab.error.on(reject);
			// Every track: without the indexes alphaTab draws only the first part, which on a
			// multi-part score is a fraction of the page vexml and OSMD draw. -1 is its "all".
			const musicXML = withoutNotationTunings(
				new TextDecoder().decode(Uint8Array.fromBase64(input.musicXML)),
			);
			if (!alphatab.load(new TextEncoder().encode(musicXML), [-1])) {
				reject(new Error('alphatab could not load the file'));
			}
		});
		return { alphatab, container };
	}
}

/**
 * The MusicXML with <staff-tuning> dropped from every staff that isn't tab. A tuning on a
 * five-line notation staff is valid MusicXML, but alphaTab's importer can't take it: painting
 * that staff's lines throws in collectSpaces, and nothing of the score draws. Only a tab
 * staff reads its tuning, so the notation staves lose nothing alphaTab would have drawn.
 */
function withoutNotationTunings(musicXML: string): string {
	const doc = new DOMParser().parseFromString(musicXML, 'application/xml');
	for (const part of Array.from(doc.querySelectorAll('part'))) {
		// A staff keeps its clef until another replaces it, so track signs through the part.
		const signs = new Map<string, string>();
		for (const attributes of Array.from(part.querySelectorAll('attributes'))) {
			for (const clef of Array.from(
				attributes.querySelectorAll(':scope > clef'),
			)) {
				const sign = clef.querySelector('sign')?.textContent?.trim() ?? '';
				signs.set(clef.getAttribute('number') ?? '1', sign);
			}
			for (const details of Array.from(
				attributes.querySelectorAll(':scope > staff-details'),
			)) {
				// Some exporters write a tab staff with a G clef, its string count in <staff-lines>
				// standing in for the TAB sign; that staff's tuning is what makes it tab.
				const tab =
					signs.get(details.getAttribute('number') ?? '1') === 'TAB' ||
					details.querySelector('staff-lines') !== null;
				if (!tab) {
					for (const tuning of Array.from(
						details.querySelectorAll('staff-tuning'),
					)) {
						tuning.remove();
					}
				}
			}
		}
	}
	return new XMLSerializer().serializeToString(doc);
}

registerPage(new AlphatabPage());
