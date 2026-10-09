import { Font, type FontInfo } from 'vexflow/core';
import { CssFont } from './css-font';

/*
 * vexflow reads a CSS font shorthand (an element's font given as one string) by setting it on a
 * DOM span and reading the longhands back, so with no DOM (createSnapshot) it throws. This reads
 * the shorthand itself, into what a browser's span reports for the shorthands vexml's fonts make:
 * `30pt 'Bravura','Source Sans 3',sans-serif` and the like. Installed only where there is no
 * document, so a browser keeps its own reading.
 */
export class FontShorthandPatch {
	private static installed = false;

	/** Read font shorthands without a DOM from now on, once per process. */
	install(): void {
		if (FontShorthandPatch.installed || typeof document !== 'undefined') {
			return;
		}
		FontShorthandPatch.installed = true;
		const fromCSSString = Font.fromCSSString;
		Font.fromCSSString = (shorthand: string): Required<FontInfo> => {
			const font = CssFont.parse(shorthand);
			if (!font) {
				return fromCSSString(shorthand);
			}
			return {
				family: font.families.map(serialize).join(', '),
				size: font.size,
				weight: font.weightName,
				style: font.style,
			};
		};
	}
}

const GENERIC = new Set([
	'serif',
	'sans-serif',
	'monospace',
	'cursive',
	'fantasy',
	'system-ui',
]);

// A family as a browser writes it back: unquoted when it reads as identifiers, else in double
// quotes.
function serialize(name: string): string {
	return GENERIC.has(name) ||
		name.split(' ').every((word) => /^-?[A-Za-z_][\w-]*$/.test(word))
		? name
		: `"${name}"`;
}
