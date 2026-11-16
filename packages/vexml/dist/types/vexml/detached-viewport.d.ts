import type { Rect } from '../core/geometry/index.js';
import type { Viewport } from './viewport.js';
export declare class DetachedViewport implements Viewport {
    clientRectOf(_rect: Rect): DOMRect;
    toScoreSpace(_clientX: number, _clientY: number): {
        x: number;
        y: number;
    };
}
