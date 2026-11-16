import type { Resource } from '../core/disposable/index.js';
import type { MarkerRect } from './marker.js';
/** A loupe's size, magnification and placement. Sizes are CSS px; anything omitted keeps its
 * current value (vexml's default on creation). */
export interface LoupeOptions {
    width?: number;
    height?: number;
    /** How many times larger than the score shows on screen. Lower trades detail for context. */
    zoom?: number;
    /** Corner radius. */
    radius?: number;
    /** The space kept between the loupe and the anchor it is shown against. */
    gap?: number;
    /** The color behind the magnified score, for a page that paints its own paper behind a
     * transparent score. Null (the default) takes the score's backgroundColor, else the nearest
     * opaque background behind it, else white. */
    paper?: string | null;
}
export interface Loupe extends Resource {
    show(anchor: MarkerRect, at?: {
        x: number;
        y: number;
    }): void;
    hide(): void;
    configure(options: LoupeOptions): void;
}
export interface LoupeHost {
    createLoupe(options: Required<LoupeOptions>): Loupe;
}
export declare function resolveLoupeOptions(base: Required<LoupeOptions>, patch: LoupeOptions): Required<LoupeOptions>;
