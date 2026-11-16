import { Rect } from '../core/geometry/index.js';
import type { RenderContext } from 'vexflow/core';
/** The shapes MusicXML's `enclosure` attribute draws around text, `none` aside. */
export declare const ENCLOSURE_SHAPES: readonly ['rectangle', 'square', 'oval', 'circle', 'bracket', 'inverted-bracket', 'triangle', 'diamond', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'nonagon', 'decagon'];
export type EnclosureShape = (typeof ENCLOSURE_SHAPES)[number];
export declare class TextEnclosure {
    private readonly shape;
    private readonly padding;
    constructor(shape: EnclosureShape, padding: number);
    /** The width and height the enclosure takes around a `w` × `h` text box. */
    size(w: number, h: number): {
        w: number;
        h: number;
    };
    /** Where the text box sits inside an enclosure occupying `outer`: centered, except in a
     * triangle, where it sits on the base. */
    textBox(outer: Rect, w: number, h: number): Rect;
    /** Stroke the enclosure filling `outer`, in the context's current stroke style. */
    draw(ctx: RenderContext, outer: Rect): void;
}
