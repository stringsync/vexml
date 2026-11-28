import { BoundingBox, Modifier, type Stave } from 'vexflow/core';
export type PauseMarkKind = 'breath-mark' | 'breath-tick' | 'caesura';
export type PauseMarkPlacement = 'above' | 'below';
export declare class PauseMark extends Modifier {
    readonly kind: PauseMarkKind;
    readonly placement: PauseMarkPlacement;
    static get CATEGORY(): string;
    private drawX;
    constructor(kind: PauseMarkKind, placement?: PauseMarkPlacement);
    getCategory(): string;
    /** Width of the mark in stave-spaces. */
    widthSpaces(): number;
    /** Set the left-edge x coordinate where draw() paints the glyph. */
    setDrawX(x: number): void;
    /** Baseline y coordinate for the glyph on `stave`. */
    baselineY(stave: Stave): number;
    getBoundingBox(): BoundingBox;
    draw(): void;
}
