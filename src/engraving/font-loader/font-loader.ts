import type { FontConfig } from '../../config';

/** Loads the fonts for a render container and returns the resolved family names.
 * Implementations differ only in side effects: DefaultFontLoader injects DOM and
 * configures VexFlow's global glyph fonts; NoopFontLoader only resolves the names. */
export interface FontLoader {
	load(
		container: HTMLElement,
		config?: FontConfig,
	): { notation: string; text: string };
}
