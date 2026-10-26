import type { FontSample } from './font-loader';

/* The distinct characters of some text, grouped by the CSS font it is set in. */
export class FontSamples {
	private readonly chars = new Map<string, Set<string>>();

	add(font: string, text: string): void {
		let chars = this.chars.get(font);
		if (!chars) {
			chars = new Set();
			this.chars.set(font, chars);
		}
		for (const char of text) {
			chars.add(char);
		}
	}

	/* One sample per font, its characters each once. */
	list(): FontSample[] {
		return Array.from(this.chars, ([font, chars]) => ({
			font,
			text: Array.from(chars).join(''),
		}));
	}
}
