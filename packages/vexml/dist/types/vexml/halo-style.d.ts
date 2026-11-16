import { Rect } from '../core/geometry/index.js';
import type { Decoratable } from './decoration.js';
import type { DecorationStyle } from './decoration-style.js';
export declare class HaloStyle implements DecorationStyle {
    readonly placement = "background";
    draw(ctx: CanvasRenderingContext2D, target: Decoratable, color: string): void;
    /** Outline the same circle as the filled halo, keeping the stroke inside its bounds. */
    drawOutline(ctx: CanvasRenderingContext2D, target: Decoratable, color: string): void;
    bounds(target: Decoratable): Rect;
}
