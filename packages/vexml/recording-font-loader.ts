import type { FontConfig } from './config';
import { NoopFontLoader } from './noop-font-loader';

/* A FontLoader that records its calls, to pin the fonts-before-parse ordering. Test-only,
 * excluded from the published package via package.json "files". */
export class RecordingFontLoader extends NoopFontLoader {
	calls: Array<FontConfig | undefined> = [];
	override load(
		container: HTMLElement,
		config?: FontConfig,
	): Promise<{ notation: string; text: string }> {
		this.calls.push(config);
		return super.load(container, config);
	}
}
