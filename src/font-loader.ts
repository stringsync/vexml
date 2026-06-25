export interface FontOverride {
	family: string;
	/** woff2 URL; if omitted, assumed already loaded (system font or user's own @font-face). */
	url?: string;
}

export interface FontConfig {
	/** Engraving glyphs: noteheads, clefs, rests, accidentals. */
	notation?: FontOverride;
	/** Typeset words vexml draws itself: part/instrument names, lyrics, titles, directions.
	 * (Tablature text — fret numbers, "H"/"P", bend labels — is drawn by VexFlow in its own
	 * Academico text font, not this one.) */
	text?: FontOverride;
}

// Module-level dedup: tracks what's been injected into <head> by "family|url" key.
// The only global state here — it tracks injected DOM, not font choices.
const injectedFontFaces = new Set<string>();
let googleFontsInjected = false;

export function loadFonts(container: HTMLElement, config?: FontConfig): void {
	if (typeof document === 'undefined') {
		return; // SSR guard
	}

	injectNotationFont(config?.notation);
	injectTextFont(config?.text);
	applyFontVariables(container, config);
}

function injectNotationFont(override?: FontOverride): void {
	const family = override?.family ?? 'Bravura';
	const url =
		override?.url ??
		new URL('../assets/fonts/Bravura.woff2', import.meta.url).href;
	injectFontFace(family, url, 'block'); // block: music font must never flash
}

function injectTextFont(override?: FontOverride): void {
	// Load the bundled text font (Source Sans 3) unless the user supplied their own URL.
	if (!override?.url) {
		injectGoogleFonts();
	}
	if (override?.url) {
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

function injectFontFace(
	family: string,
	url: string,
	display: 'block' | 'swap',
): void {
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
function applyFontVariables(container: HTMLElement, config?: FontConfig): void {
	const notationFamily = config?.notation?.family ?? 'Bravura';
	const textFamily = config?.text?.family ?? 'Source Sans 3';

	container.style.setProperty(
		'--vexml-font-notation',
		`'${notationFamily}', serif`,
	);
	container.style.setProperty(
		'--vexml-font-text',
		`'${textFamily}', sans-serif`,
	);
}
