import type { Rect } from '../core/geometry/index.js';
export interface Viewport {
    clientRectOf(rect: Rect): DOMRect;
    toScoreSpace(clientX: number, clientY: number): {
        x: number;
        y: number;
    };
}
