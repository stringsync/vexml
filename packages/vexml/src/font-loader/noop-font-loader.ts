import type { FontConfig } from '../config';
import { FontFamilies } from './font-families';
import type { FontLoader } from './font-loader';

/** Resolves the family names without touching the DOM or VexFlow — for callers that
 * need the resolved names but none of the side effects (headless environments, tests). */
export class NoopFontLoader implements FontLoader {
	load(
		_container: HTMLElement,
		config?: FontConfig,
	): { notation: string; text: string } {
		return new FontFamilies(config);
	}
}
