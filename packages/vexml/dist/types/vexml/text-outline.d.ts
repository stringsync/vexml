import type { GlyphOutline } from './glyph-outline.js';
export interface PlacedGlyph {
    readonly glyph: GlyphOutline;
    readonly x: number;
    readonly y: number;
    readonly scale: number;
    readonly skew: number;
}
export declare class TextOutline {
    private readonly glyphs;
    constructor(glyphs: readonly PlacedGlyph[]);
    trace(ctx: CanvasRenderingContext2D, x: number, y: number): void;
    fill(ctx: CanvasRenderingContext2D, x: number, y: number): void;
}
