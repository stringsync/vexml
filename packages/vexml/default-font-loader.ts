import { VexFlow } from 'vexflow';
import type { FontConfig, FontOverride } from './config';
import { FontFamilies } from './font-families';
import type { FontLoader } from './font-loader';

// DOM-derived dedup: injected <style>/<link> elements are tagged with data attributes
// (data-vexml-font-face="family|url", data-vexml-google-fonts) and checked before
// injecting, so the document itself tracks what's been injected — no process-global
// state. It tracks injected DOM, not font choices.
export class DefaultFontLoader implements FontLoader {
	/** Inject the requested fonts, wait until they are resident, and return the resolved
	 * family names. The family-name fallbacks are applied here, once, from
	 * DEFAULT_FONT_CONFIG — callers (the CSS variables) and the VexFlow.setFonts call
	 * below reuse the returned names instead of defaulting again. */
	async load(
		container: HTMLElement,
		config?: FontConfig,
	): Promise<{ notation: string; text: string }> {
		const { notation, text } = new FontFamilies(config);
		if (typeof document === 'undefined') {
			return { notation, text }; // SSR guard
		}

		this.injectNotationFont(config?.notation);
		this.injectTextFont(config?.text);
		this.applyFontVariables(container, notation, text);
		// VexFlow engraves glyphs from its own bundled font modules via global state, not the
		// --vexml-font-notation CSS var. setFonts sets a CSS font-family stack the browser falls
		// through per glyph: music glyphs (noteheads, clefs, the stacked "TAB" clef) come from the
		// notation font, and everything VexFlow types — tab fret numbers, "H"/"P", bend/annotation
		// labels — from the next family that has the letter, so it matches the part labels (both
		// default to Source Sans 3). The trailing sans-serif keeps text off the browser's serif
		// default. Families MUST be quoted: an unquoted multi-word name like Source Sans 3 makes
		// the whole CSS font string invalid and every glyph falls back to serif. Reset each call
		// so one render's font choice can't leak into the next.
		VexFlow.setFonts(`'${notation}'`, `'${text}'`, 'sans-serif');
		await this.settle(notation, text);
		return { notation, text };
	}

	/** Wait until the resolved faces are resident, so layout never measures text against
	 * fallback metrics. Chromium loads a face lazily on first use, and the pipeline
	 * positions every text glyph — tab fret digits, part labels, annotations — by
	 * measuring it; a cold face measures with substitute metrics and the glyphs land in
	 * the wrong place once the real face arrives. Faces the loader can see
	 * (@font-face injections, the Google Fonts link, VexFlow's embedded Bravura) sit in
	 * document.fonts and are awaited directly; a bare family (FontOverride.url absent —
	 * a system font) is invisible to the CSS Font Loading API, so it is forced resident
	 * by measuring a probe span and waiting for the measurement to stop changing. */
	private async settle(notation: string, text: string): Promise<void> {
		// Partial DOM (unit-test fakes, exotic embedders): nothing to wait for. Real
		// browser renders always have fonts, a body, and rAF.
		if (
			!document.fonts ||
			!document.body ||
			!globalThis.requestAnimationFrame
		) {
			return;
		}
		// DOM-derived dedup, like the injectors above: one settled marker per family pair,
		// so re-renders skip the probe entirely. Families are FontFamilies.sanitize'd, so
		// the key is safe to embed in the attribute selector.
		const key = `${notation}|${text}`;
		if (
			document.head.querySelector(`meta[data-vexml-fonts-settled="${key}"]`)
		) {
			return;
		}

		// Sample text chooses which glyphs must load: SMuFL staples for the notation face
		// (clefs, a notehead, the flat/sharp pair), and the digits/letters the text face
		// renders (fret numbers are the metrics-sensitive worst case). Weights mirror what
		// a render can use: the Google Fonts link loads 300/400/600; a face that lacks a
		// weight just resolves to the nearest one, which is harmless to await.
		const specs: Array<{ font: string; sample: string }> = [
			// G clef, F clef, black notehead, flat, sharp — the SMuFL staples every score paints.
			{ font: `1em '${notation}'`, sample: '\uE050\uE062\uE0A4\uE260\uE262' },
			...[300, 400, 600].map((weight) => ({
				font: `${weight} 1em '${text}'`,
				sample: '0123456789 HPabcdefgh',
			})),
		];
		await Promise.all(
			specs.map(({ font, sample }) => document.fonts.load(font, sample)),
		);

		// The probe: paint each face/weight offscreen and re-measure until two consecutive
		// frames agree. A resident face settles on the second look (one frame); a lazy
		// system face gets its load triggered by the first measurement and converges as
		// soon as the real metrics arrive. Bounded so a pathological environment degrades
		// to today's behavior instead of hanging the render.
		const probe = document.createElement('div');
		probe.style.cssText =
			'position:absolute;visibility:hidden;left:-9999px;top:0';
		for (const { font, sample } of specs) {
			const span = document.createElement('span');
			span.style.font = font;
			span.textContent = sample;
			probe.appendChild(span);
		}
		document.body.appendChild(probe);
		try {
			let previous = '';
			for (let attempt = 0; attempt < 20; attempt++) {
				const widths = Array.from(probe.children)
					.map((span) => span.getBoundingClientRect().width)
					.join();
				if (widths === previous) {
					break;
				}
				previous = widths;
				await document.fonts.ready;
				await new Promise(requestAnimationFrame);
			}
		} finally {
			probe.remove();
		}

		const settled = document.createElement('meta');
		settled.setAttribute('data-vexml-fonts-settled', key);
		document.head.appendChild(settled);
	}

	private injectNotationFont(override?: FontOverride): void {
		// No notation config: VexFlow's main entry already Font.load()s Bravura (its embedded
		// base64 woff2) under this exact family name with display:block, so we inject nothing
		// and reuse that face — no second copy needed.
		if (!override) {
			return;
		}
		// A URL: inject the caller's own @font-face. A family alone: assume it's already
		// available (a system font or the caller's own @font-face), per FontOverride.url —
		// inject nothing, so the family resolves synchronously with no fetch.
		if (override.url) {
			this.injectFontFace(override.family, override.url, 'block');
		}
	}

	private injectTextFont(override?: FontOverride): void {
		// No text config: load the default (Source Sans 3) from Google Fonts.
		if (!override) {
			this.injectGoogleFonts();
			return;
		}
		// A URL: inject the caller's own @font-face. A family alone: assume it's already
		// available (a system font or the caller's own @font-face), per FontOverride.url —
		// inject nothing, so the family resolves synchronously with no network fetch.
		if (override.url) {
			this.injectFontFace(override.family, override.url, 'swap');
		}
	}

	private injectGoogleFonts(): void {
		// Dedup via the data-vexml-google-fonts marker on the injected <link>.
		if (document.head.querySelector('link[data-vexml-google-fonts]')) {
			return;
		}
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href =
			'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600&display=swap';
		link.setAttribute('data-vexml-google-fonts', '');
		document.head.appendChild(link);
	}

	private injectFontFace(
		family: string,
		url: string,
		display: 'block' | 'swap',
	): void {
		family = FontFamilies.sanitize(family);
		url = FontFamilies.sanitize(url);
		const key = `${family}|${url}`;
		// Dedup via the data-vexml-font-face marker on the injected <style>. The key is safe
		// to embed in the attribute selector: FontFamilies.sanitize already stripped quotes and
		// backslashes.
		if (document.head.querySelector(`style[data-vexml-font-face="${key}"]`)) {
			return;
		}

		const style = document.createElement('style');
		style.setAttribute('data-vexml-font-face', key);
		style.textContent = `
			@font-face {
				font-family: '${family}';
				src: url('${url}') format('woff2');
				font-weight: normal;
				font-style: normal;
				font-display: ${display};
			}
		`;
		document.head.appendChild(style);
	}

	// Scopes CSS variables to the render container — not :root — so two render() calls
	// on the same page can use different fonts independently.
	private applyFontVariables(
		container: HTMLElement,
		notationFamily: string,
		textFamily: string,
	): void {
		container.style.setProperty(
			'--vexml-font-notation',
			`'${notationFamily}', serif`,
		);
		container.style.setProperty(
			'--vexml-font-text',
			`'${textFamily}', sans-serif`,
		);
	}
}
