import { Stem } from 'vexflow/core';

/*
 * The width vexflow strokes every stem at. vexflow reads it from Tables.STEM_WIDTH through
 * Stem.WIDTH, and exports neither the table nor a setter from vexflow/core, so this swaps the
 * getter, once per page, for one that answers the width a draw pass sets, else vexflow's own.
 * Global vexflow state like the stem color: every pass sets it afresh.
 */
export class StemWidth {
	private static installed = false;
	private static width: number | null = null;

	/* Stroke stems `width` px wide from here on; null puts vexflow's own width back. */
	set(width: number | null): void {
		if (!StemWidth.installed) {
			StemWidth.installed = true;
			const vexflow = Object.getOwnPropertyDescriptor(Stem, 'WIDTH')?.get;
			Object.defineProperty(Stem, 'WIDTH', {
				configurable: true,
				get: () => StemWidth.width ?? vexflow?.call(Stem),
			});
		}
		StemWidth.width = width;
	}
}
