import { type ElementStyle, type FontInfo, Metrics } from 'vexflow/core';

/*
 * vexflow 5.0.0 resolves every element's font and style once per category and caches them,
 * then hands each new element a structuredClone of the cached object. Every notehead, stem,
 * flag and accidental asks for both, so a long score pays for tens of thousands of clones:
 * about a sixth of a render. The objects are flat (strings and numbers), so a spread copies
 * them just as deeply, and each element still gets its own (some, like Accidental, resize
 * their fontInfo in place).
 *
 * Remove this once vexflow stops cloning: metrics-patch.test.ts fails when it does.
 */
export class MetricsPatch {
	private static installed = false;

	/** Swap Metrics' cloning getters for copying ones, once per page. */
	install(): void {
		if (MetricsPatch.installed) {
			return;
		}
		MetricsPatch.installed = true;
		const fonts = new Map<string, Required<FontInfo>>();
		const styles = new Map<string, ElementStyle>();
		const { getFontInfo, getStyle, clear } = Metrics;
		Metrics.getFontInfo = (key: string): Required<FontInfo> => {
			let font = fonts.get(key);
			if (!font) {
				font = getFontInfo.call(Metrics, key);
				fonts.set(key, font);
			}
			return { ...font };
		};
		Metrics.getStyle = (key: string): ElementStyle => {
			let style = styles.get(key);
			if (!style) {
				style = getStyle.call(Metrics, key);
				styles.set(key, style);
			}
			return { ...style };
		};
		// A cleared key re-resolves (vexml clears 'Stem' to recolor stems), so drop ours too.
		Metrics.clear = (key?: string): void => {
			if (key) {
				fonts.delete(key);
				styles.delete(key);
			} else {
				fonts.clear();
				styles.clear();
			}
			clear.call(Metrics, key);
		};
	}
}
