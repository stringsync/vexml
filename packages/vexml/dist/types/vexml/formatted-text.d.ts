import { Rect } from '../core/geometry/index.js';
import { type RenderContext } from 'vexflow/core';
import { type EnclosureShape } from './text-enclosure.js';
export declare class FormattedText {
    private readonly context;
    private readonly text;
    private readonly style;
    /** The box's size once rotated: what the collision resolver places. */
    readonly w: number;
    readonly h: number;
    private readonly boxW;
    private readonly boxH;
    private readonly textW;
    private readonly inkLeft;
    private readonly innerH;
    private readonly enclosure;
    constructor(context: RenderContext, text: string, style: FormattedTextStyle);
    /** Top of the placed box that aligns the text's ink (or baseline) on anchorY.
     * Decorations travel with the text; they do not change its alignment point. */
    topAt(anchorY: number, align: 'top' | 'middle' | 'bottom' | 'baseline'): number;
    private baselineIn;
    private radians;
    /** Draw the text, its underlines and its enclosure into `placed`, a `w` × `h` box, in the
     * context's current font, fill and stroke. */
    draw(placed: Rect): void;
    private drawUpright;
}
export type FormattedTextStyle = {
    /** The face the context is set to, to measure the ink an enclosure holds. */
    font: {
        family: string;
        size: number;
        weight: string;
        fontStyle: string;
    };
    /** The height of the text's box: the font size, or the ink's when that is shorter. */
    textHeight: number;
    /** Whether the ink hangs down from the baseline rather than standing on it. */
    hangs?: boolean;
    /** How many lines run under the text. Absent means none. */
    underline?: number;
    /** The shape drawn around the text. Absent means none. */
    enclosure?: EnclosureShape;
    /** Air between the text and its enclosure. */
    padding?: number;
    /** The enclosure's stroke width (`<line-width type="enclosure">`). Absent means 1px. */
    enclosureWidth?: number;
    /** Degrees clockwise the whole box turns, about its middle. Absent means upright. */
    rotation?: number;
};
