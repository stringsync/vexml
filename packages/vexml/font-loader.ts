import type { FontConfig } from './config';

/** Loads the fonts for a render container and returns the resolved family names. Use
 * DefaultFontLoader to make the fonts ready to draw with, or NoopFontLoader when only the
 * names are needed. */
export interface FontLoader {
	// Implementations differ only in side effects: DefaultFontLoader injects DOM, configures
	// VexFlow's global glyph fonts, and resolves only once the faces are resident (so layout
	// never measures text against fallback metrics); NoopFontLoader only resolves the names.
	load(
		container: HTMLElement,
		config?: FontConfig,
	): Promise<{ notation: string; text: string }>;

	/** Load every face the samples draw in, as a render measured them. True when one of
	 * them was not resident before, so what was measured with it measured a fallback. */
	ensure(samples: readonly FontSample[]): Promise<boolean>;
}

/** Text a render measured, and the CSS font it measured it in. */
export type FontSample = { font: string; text: string };
