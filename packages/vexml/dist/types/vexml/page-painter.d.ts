import type { Rect } from '../core/geometry/index.js';
export interface PagePainter {
    readonly pixelRatio: number;
    paperColor(): string;
    paintEngraving(ctx: CanvasRenderingContext2D, region: Rect, scale: number): void;
}
