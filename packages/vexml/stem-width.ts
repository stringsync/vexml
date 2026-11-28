import { VexFlow } from 'vexflow/core';

/*
 * The width vexflow strokes every stem at: global vexflow state (Stem.WIDTH reads
 * Tables.STEM_WIDTH), set through VexFlow.STEM_WIDTH. Like the stem color, every pass sets it
 * afresh.
 */
export class StemWidth {
	private static readonly vexflow = VexFlow.STEM_WIDTH;

	/* Stroke stems `width` px wide from here on; null puts vexflow's own width back. */
	set(width: number | null): void {
		VexFlow.STEM_WIDTH = width ?? StemWidth.vexflow;
	}
}
