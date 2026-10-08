/*
 * The strip a panoramic score pins to its scroll box's left edge as the opening reaches it
 * (config `stickySignatures`): the staves' opening clefs and keys, redrawn as if the page were
 * folded over there. The Stage shows and moves it; SignatureFold engraves it. Everything is in
 * score space (the base canvas's CSS px).
 */
export interface Fold {
	/** Where the strip's left edge sits in the score: the system's left margin, past any
	 * part-label column (labels aren't pinned). */
	readonly left: number;
	/** How wide the strip is, from `left`. The same for every strip, so the fold never
	 * changes width as clefs and keys change under it. */
	readonly width: number;
	/** How tall the strip is: the whole engraving, so its staves line up with the score's. */
	readonly height: number;
	/** Which strip is in effect at score x: the last clef/key change at or before it. */
	indexAt(x: number): number;
	/** Engrave strip `index` onto `context`, whose transform already maps score space onto
	 * it (so the strip's left edge is at x = `left`). Ink only: the caller paints the paper. */
	paint(context: CanvasRenderingContext2D, index: number): void;
}
