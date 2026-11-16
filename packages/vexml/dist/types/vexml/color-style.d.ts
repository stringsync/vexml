import { Rect } from '../core/geometry/index.js';
import type { Decoratable } from './decoration.js';
import type { DecorationStyle } from './decoration-style.js';
export declare class ColorStyle implements DecorationStyle {
    readonly placement = "content";
    draw(ctx: CanvasRenderingContext2D, target: Decoratable, color: string): void;
    bounds(target: Decoratable): Rect;
}
