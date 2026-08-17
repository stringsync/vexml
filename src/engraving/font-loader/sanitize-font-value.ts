/** Strip characters that could terminate the quoted CSS string these font values are
 * interpolated into (the @font-face rule, the --vexml-font-* CSS vars, VexFlow.setFonts)
 * and inject rules. Not full CSS escaping — just enough that a hostile family/url can't
 * break out of its quotes; spaces stay so names like "Source Sans 3" survive. Font config
 * is meant to be developer-controlled; this is a backstop for apps that forward untrusted
 * input. */
export function sanitizeFontValue(value: string): string {
	return value.replace(/['"\\<>\r\n\f\t\0]/g, '');
}
