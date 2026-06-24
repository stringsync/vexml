export interface FontOverride {
	family: string;
	/** woff2 URL; if omitted, assumed already loaded (system font or user's own @font-face). */
	url?: string;
}

export interface FontConfig {
	music?: FontOverride;
	text?: FontOverride;
	ui?: FontOverride;
}

// Module-level dedup: tracks what's been injected into <head> by "family|url" key.
// The only global state here — it tracks injected DOM, not font choices.
const injectedFontFaces = new Set<string>();
let googleFontsInjected = false;

export function loadFonts(container: HTMLElement, config?: FontConfig): void {
	if (typeof document === 'undefined') {
		return; // SSR guard
	}

	injectMusicFont(config?.music);
	injectTextFonts(config?.text, config?.ui);
	applyFontVariables(container, config);
}

function injectMusicFont(override?: FontOverride): void {
	const family = override?.family ?? 'Bravura';
	const url =
		override?.url ??
		new URL('../assets/fonts/Bravura.woff2', import.meta.url).href;
	injectFontFace(family, url, 'block'); // block: music font must never flash
}

function injectTextFonts(
	textOverride?: FontOverride,
	uiOverride?: FontOverride,
): void {
	// Load Google Fonts for any role not fully overridden with a custom URL.
	if (!textOverride?.url || !uiOverride?.url) {
		injectGoogleFonts();
	}

	if (textOverride?.url) {
		injectFontFace(textOverride.family, textOverride.url, 'swap');
	}
	if (uiOverride?.url) {
		injectFontFace(uiOverride.family, uiOverride.url, 'swap');
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
		'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Source+Sans+3:wght@300;400;600&display=swap';
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
	const musicFamily = config?.music?.family ?? 'Bravura';
	const textFamily = config?.text?.family ?? 'EB Garamond';
	const uiFamily = config?.ui?.family ?? 'Source Sans 3';

	container.style.setProperty('--vexml-font-music', `'${musicFamily}', serif`);
	container.style.setProperty('--vexml-font-text', `'${textFamily}', serif`);
	container.style.setProperty('--vexml-font-ui', `'${uiFamily}', sans-serif`);
}
