import type { FontConfig } from './config';
import type { FontSample } from './font-loader';
import { NoopFontLoader } from './noop-font-loader';

/* A FontLoader that records its calls, to pin the fonts-before-parse ordering. Test-only,
 * excluded from the published package via package.json "files". */
export class RecordingFontLoader extends NoopFontLoader {
	calls: Array<FontConfig | undefined> = [];
	// When set, a load never finishes, as a font stuck on a slow network.
	stalled = false;
	ensured: Array<readonly FontSample[]> = [];
	// When set, the next ensure finds a face it had to load, as a split face's rarer file.
	cold = false;

	override load(
		container: HTMLElement,
		config?: FontConfig,
	): Promise<{ notation: string; text: string }> {
		this.calls.push(config);
		return this.stalled ? new Promise(() => {}) : super.load(container, config);
	}

	override async ensure(samples: readonly FontSample[]): Promise<boolean> {
		this.ensured.push(samples);
		const cold = this.cold;
		this.cold = false;
		return cold;
	}
}
