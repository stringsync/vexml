export interface TechnicalMark {
    /** Tells a technical mark apart from the other modifiers a note carries. */
    readonly kind: 'technical';
    /** Which side of the stave this mark stacks on (`<technical placement>`). */
    readonly below: boolean;
    /** How much vertical room this mark claims in its column, ink plus air. */
    rowHeight(): number;
    /** The mark's drawn width. */
    getWidth(): number;
    /** Draw the mark with its row's bottom edge at `y`, rather than where vexflow would
     * stack it. */
    setBaselineY(y: number): void;
    /** The ink to draw the mark in. */
    setStyle(style: {
        fillStyle?: string;
    }): void;
    /** The box the mark was drawn in; only its top edge is read. */
    getBoundingBox(): {
        getY(): number;
    };
}
/** Whether `modifier` is a technical mark. Narrows in place, so filtering a note's
 * modifiers keeps whatever else the caller knows about them. */
export declare function isTechnicalMark<T>(modifier: T): modifier is T & TechnicalMark;
