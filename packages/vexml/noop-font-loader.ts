import type { FontConfig } from './config';
import { FontFamilies } from './font-families';
import type { FontLoader, FontSample } from './font-loader';

/** Resolves the family names without touching the DOM or VexFlow, for callers that
 * need the resolved names but none of the side effects (headless environments, tests). */
export class NoopFontLoader implements FontLoader {
	async load(
		_container: HTMLElement,
		config?: FontConfig,
	): Promise<{ notation: string; text: string }> {
		return new FontFamilies(config);
	}

	async ensure(_samples: readonly FontSample[]): Promise<boolean> {
		return false;
	}
}
