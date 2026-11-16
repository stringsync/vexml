import type { Rect } from '../core/geometry/index.js';
import type { Decoratable } from './decoration.js';
import type { LayerKind } from './layer.js';
export interface DecorationStyle {
    readonly placement: LayerKind;
    draw(ctx: CanvasRenderingContext2D, target: Decoratable, color: string): void;
    bounds(target: Decoratable): Rect;
}
