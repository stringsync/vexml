import type { Rect } from '../core/geometry/index.js';
export interface Bounded {
    readonly rect: Rect;
    getBoundingClientRect(): DOMRect;
}
export interface Decoratable extends Bounded {
    drawColor(ctx: CanvasRenderingContext2D, color: string): void;
}
export interface Decoration {
    set(target: Decoratable, color: string | null): void;
    has(target: Decoratable): boolean;
}
export interface Decorations {
    readonly color: Decoration;
    readonly halo: Decoration;
}
