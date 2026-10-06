import { DEFAULT_FONT_CONFIG, type FontConfig } from './config';

/**
 * The notation and text family names a font config resolves to, with the DEFAULT_FONT_CONFIG
 * fallbacks applied and every name made safe to put in a quoted CSS string.
 */
export class FontFamilies {
	readonly notation: string;
	readonly text: string;

	constructor(config?: FontConfig) {
		// Both FontLoaders answer with these, so the two agree on what a config means even
		// though only one of them touches the DOM. Every value is sanitized because each one is
		// interpolated into a quoted CSS string: the @font-face rule, the --vexml-font-* CSS
		// vars, VexFlow.setFonts.
		this.notation = FontFamilies.sanitize(
			config?.notation?.family ?? DEFAULT_FONT_CONFIG.notation.family,
		);
		this.text = FontFamilies.sanitize(
			config?.text?.family ?? DEFAULT_FONT_CONFIG.text.family,
		);
	}

	/**
	 * Make a font family or url safe to interpolate into a quoted CSS string, so it can't
	 * break out of its quotes and inject rules. Spaces stay, so names like "Source Sans 3"
	 * survive.
	 */
	static sanitize(value: string): string {
		// Not full CSS escaping: just the characters that could terminate the string. Font
		// config is meant to be developer-controlled; this is a backstop for apps that forward
		// untrusted input.
		return value.replace(/['"\\<>\r\n\f\t\0]/g, '');
	}
}
