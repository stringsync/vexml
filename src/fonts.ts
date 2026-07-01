import { DEFAULT_FONT_CONFIG } from './config';

export interface FontOverride {
	family: string;
	/** woff2 URL; if omitted, assumed already loaded (system font or user's own @font-face). */
	url?: string;
	/** CSS color for glyphs drawn in this font; if omitted, the renderer's default is used. */
	color?: string;
}

export interface FontConfig {
	/** Engraving glyphs: noteheads, clefs, rests, accidentals. */
	notation?: FontOverride;
	/** Typeset words: part/instrument names, lyrics, titles, directions that vexml draws
	 * itself, plus the tablature text VexFlow types (fret numbers, "H"/"P", bend labels). */
	text?: FontOverride;
}

// Module-level dedup: tracks what's been injected into <head> by "family|url" key.
// The only global state here — it tracks injected DOM, not font choices.
const injectedFontFaces = new Set<string>();
let googleFontsInjected = false;

/** Inject the requested fonts and return the resolved family names. The family-name
 * fallbacks are applied here, once, from DEFAULT_FONT_CONFIG — callers (render's
 * VexFlow.setFonts, the CSS variables) reuse the returned names instead of defaulting
 * again. */
export function loadFonts(
	container: HTMLElement,
	config?: FontConfig,
): { notation: string; text: string } {
	const notation = sanitizeFontValue(
		config?.notation?.family ?? DEFAULT_FONT_CONFIG.notation.family,
	);
	const text = sanitizeFontValue(
		config?.text?.family ?? DEFAULT_FONT_CONFIG.text.family,
	);
	if (typeof document === 'undefined') {
		return { notation, text }; // SSR guard
	}

	injectNotationFont(notation, config?.notation);
	injectTextFont(config?.text);
	applyFontVariables(container, notation, text);
	applyColorVariable(
		container,
		'--vexml-color-notation',
		config?.notation?.color,
	);
	applyColorVariable(container, '--vexml-color-text', config?.text?.color);
	return { notation, text };
}

function injectNotationFont(family: string, override?: FontOverride): void {
	// No notation config: load the bundled default (Bravura) via @font-face.
	if (!override) {
		injectFontFace(
			family,
			new URL('../assets/fonts/Bravura.woff2', import.meta.url).href,
			'block', // block: music font must never flash
		);
		return;
	}
	// A URL: inject the caller's own @font-face. A family alone: assume it's already
	// available (a system font or the caller's own @font-face), per FontOverride.url —
	// inject nothing, so the family resolves synchronously with no fetch.
	if (override.url) {
		injectFontFace(family, override.url, 'block');
	}
}

function injectTextFont(override?: FontOverride): void {
	// No text config: load the default (Source Sans 3) from Google Fonts.
	if (!override) {
		injectGoogleFonts();
		return;
	}
	// A URL: inject the caller's own @font-face. A family alone: assume it's already
	// available (a system font or the caller's own @font-face), per FontOverride.url —
	// inject nothing, so the family resolves synchronously with no network fetch.
	if (override.url) {
		injectFontFace(override.family, override.url, 'swap');
	}
}

function injectGoogleFonts(): void {
	if (googleFontsInjected) {
		return;
	}
	googleFontsInjected = true;
	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href =
		'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600&display=swap';
	document.head.appendChild(link);
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

function injectFontFace(
	family: string,
	url: string,
	display: 'block' | 'swap',
): void {
	family = sanitizeFontValue(family);
	url = sanitizeFontValue(url);
	const key = `${family}|${url}`;
	if (injectedFontFaces.has(key)) {
		return;
	}
	injectedFontFaces.add(key);

	const style = document.createElement('style');
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
function applyFontVariables(
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
function applyColorVariable(
	container: HTMLElement,
	name: string,
	color?: string,
): void {
	if (color) {
		container.style.setProperty(name, sanitizeFontValue(color));
	}
}
