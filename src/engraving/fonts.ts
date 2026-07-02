import { VexFlow } from 'vexflow';
import {
	DEFAULT_FONT_CONFIG,
	type FontConfig,
	type FontOverride,
} from '../config';

/** Loads the fonts for a render container and returns the resolved family names.
 * Implementations differ only in side effects: DefaultFontLoader injects DOM and
 * configures VexFlow's global glyph fonts; NoopFontLoader only resolves the names. */
export interface FontLoader {
	load(
		container: HTMLElement,
		config?: FontConfig,
	): { notation: string; text: string };
}

// DOM-derived dedup: injected <style>/<link> elements are tagged with data attributes
// (data-vexml-font-face="family|url", data-vexml-google-fonts) and checked before
// injecting, so the document itself tracks what's been injected — no process-global
// state. It tracks injected DOM, not font choices.
export class DefaultFontLoader implements FontLoader {
	/** Inject the requested fonts and return the resolved family names. The family-name
	 * fallbacks are applied here, once, from DEFAULT_FONT_CONFIG — callers (the CSS
	 * variables) and the VexFlow.setFonts call below reuse the returned names instead
	 * of defaulting again. */
	load(
		container: HTMLElement,
		config?: FontConfig,
	): { notation: string; text: string } {
		const { notation, text } = resolveFamilies(config);
		if (typeof document === 'undefined') {
			return { notation, text }; // SSR guard
		}

		this.injectNotationFont(config?.notation);
		this.injectTextFont(config?.text);
		this.applyFontVariables(container, notation, text);
		this.applyColorVariable(
			container,
			'--vexml-color-notation',
			config?.notation?.color,
		);
		this.applyColorVariable(
			container,
			'--vexml-color-text',
			config?.text?.color,
		);
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
		return { notation, text };
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
		family = sanitizeFontValue(family);
		url = sanitizeFontValue(url);
		const key = `${family}|${url}`;
		// Dedup via the data-vexml-font-face marker on the injected <style>. The key is safe
		// to embed in the attribute selector: sanitizeFontValue already stripped quotes and
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

	// ponytail: just exposes the color as a CSS var; the renderer doesn't read it yet.
	// Wire it into draw.ts (alongside the --vexml-font-text reader) when color is needed.
	private applyColorVariable(
		container: HTMLElement,
		name: string,
		color?: string,
	): void {
		if (color) {
			container.style.setProperty(name, sanitizeFontValue(color));
		}
	}
}

/** Resolves the family names without touching the DOM or VexFlow — for callers that
 * need the resolved names but none of the side effects (headless environments, tests). */
export class NoopFontLoader implements FontLoader {
	load(
		_container: HTMLElement,
		config?: FontConfig,
	): { notation: string; text: string } {
		return resolveFamilies(config);
	}
}

// The pure name-resolution logic shared by both loaders: the family-name fallbacks
// from DEFAULT_FONT_CONFIG, sanitized once.
function resolveFamilies(config?: FontConfig): {
	notation: string;
	text: string;
} {
	const notation = sanitizeFontValue(
		config?.notation?.family ?? DEFAULT_FONT_CONFIG.notation.family,
	);
	const text = sanitizeFontValue(
		config?.text?.family ?? DEFAULT_FONT_CONFIG.text.family,
	);
	return { notation, text };
}

/** Strip characters that could terminate the quoted CSS string these font values are
 * interpolated into (the @font-face rule, the --vexml-font-* CSS vars, VexFlow.setFonts)
 * and inject rules. Not full CSS escaping — just enough that a hostile family/url can't
 * break out of its quotes; spaces stay so names like "Source Sans 3" survive. Font config
 * is meant to be developer-controlled; this is a backstop for apps that forward untrusted
 * input. */
export function sanitizeFontValue(value: string): string {
	return value.replace(/['"\\<>\r\n\f\t\0]/g, '');
}
