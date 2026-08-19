import { DEFAULT_FONT_CONFIG, type FontConfig } from '../config';

/**
 * The family names a FontLoader resolves a config down to, with the DEFAULT_FONT_CONFIG
 * fallbacks applied once. Both loaders answer with these, so the two agree on what a config
 * means even though only one of them touches the DOM.
 *
 * Every value passing through here is sanitized, because each one is interpolated into a quoted
 * CSS string — the @font-face rule, the --vexml-font-* CSS vars, VexFlow.setFonts.
 */
export class FontFamilies {
	readonly notation: string;
	readonly text: string;

	constructor(config?: FontConfig) {
		this.notation = FontFamilies.sanitize(
			config?.notation?.family ?? DEFAULT_FONT_CONFIG.notation.family,
		);
		this.text = FontFamilies.sanitize(
			config?.text?.family ?? DEFAULT_FONT_CONFIG.text.family,
		);
	}

	/**
	 * Strip the characters that could terminate the quoted CSS string a font value is
	 * interpolated into, and inject rules after it. Not full CSS escaping — just enough that a
	 * hostile family or url can't break out of its quotes; spaces stay so names like
	 * "Source Sans 3" survive. Font config is meant to be developer-controlled; this is a
	 * backstop for apps that forward untrusted input.
	 */
	static sanitize(value: string): string {
		return value.replace(/['"\\<>\r\n\f\t\0]/g, '');
	}
}
