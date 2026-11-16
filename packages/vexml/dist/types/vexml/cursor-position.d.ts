import type { Rect } from '../core/geometry/index.js';
import type { CursorHost } from './cursor-host.js';
import type { Bounded } from './decoration.js';
export declare class CursorPosition implements Bounded {
    readonly rect: Rect;
    private readonly host;
    constructor(rect: Rect, host: CursorHost);
    getBoundingClientRect(): DOMRect;
}
