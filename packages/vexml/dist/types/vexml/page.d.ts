import type { Rect } from '../core/geometry/index.js';
import type { PagePainter } from './page-painter.js';
import type { System } from './system.js';
export declare class Page {
    private readonly index;
    /** The page's box in score space: pageWidth × pageHeight, margins included. */
    readonly rect: Rect;
    private readonly systems;
    private readonly painter;
    constructor(index: number, 
    /** The page's box in score space: pageWidth × pageHeight, margins included. */
    rect: Rect, systems: readonly System[], painter: PagePainter);
    /** The 0-based page number, top to bottom. */
    getIndex(): number;
    /** The systems that start on this page, top to bottom. */
    getSystems(): System[];
    /** The page as an image (default `'image/png'`; `quality` is for lossy types, as
     * `HTMLCanvasElement.toBlob`). Drawn when called, so the score can be disposed before the
     * promise settles. */
    toBlob(type?: string, quality?: number): Promise<Blob>;
    /** The page drawn on a fresh canvas the caller owns, `pixelRatio` device px per CSS px (less
     * if a page that size would pass the browser's canvas area cap). */
    toCanvas(): HTMLCanvasElement;
}
