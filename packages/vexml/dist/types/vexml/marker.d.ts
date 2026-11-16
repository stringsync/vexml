import type { Resource } from '../core/disposable/index.js';
/** Where a marker's box sits, in score px. A `Rect` is one; so is any plain `{ x, y, w, h }`. */
export interface MarkerRect {
    x: number;
    y: number;
    w: number;
    h: number;
}
/** How a marker's box is drawn beyond its rect and color. */
export interface MarkerOptions {
    /** Corner radius in score px; `w / 2` on a square draws a circle. Defaults to 0 (square). */
    radius?: number;
}
export interface Marker extends Resource {
    show(rect: MarkerRect, color: string, options?: MarkerOptions): void;
    hide(): void;
}
export interface MarkerHost {
    createMarker(zIndex?: number): Marker;
}
