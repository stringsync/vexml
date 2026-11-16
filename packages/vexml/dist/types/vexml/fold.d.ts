export interface Fold {
    /** Where the strip's left edge sits in the score: the system's left margin, past any
     * part-label column (labels aren't pinned). */
    readonly left: number;
    /** How wide the strip is, from `left`. The same for every strip, so the fold never
     * changes width as clefs and keys change under it. */
    readonly width: number;
    /** How tall the strip is: the whole engraving, so its staves line up with the score's. */
    readonly height: number;
    /** Where each strip takes effect, in score x, ascending: one per clef/key change. */
    readonly starts: readonly number[];
    /** Which strip is in effect at score x: the last clef/key change at or before it. */
    indexAt(x: number): number;
    /** Engrave strip `index` onto `context`, whose transform already maps score space onto
     * it (so the strip's left edge is at x = `left`). Ink only: the caller paints the paper. */
    paint(context: CanvasRenderingContext2D, index: number): void;
}
