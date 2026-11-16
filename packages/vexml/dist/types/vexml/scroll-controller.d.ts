import type { Rect } from '../core/geometry/index.js';
import type { ScrollHost } from './scroll-host.js';
import type { Scroller, ScrollerOptions } from './scroller.js';
export declare class ScrollController implements Scroller {
    private readonly host;
    private tween;
    private frameTimer;
    private resizeSettleTimer;
    private readonly timer;
    constructor(host: ScrollHost);
    suspendForResize(): void;
    scrollIntoView(rect: Rect, opts?: ScrollerOptions): void;
    private smoothScrollTo;
    private step;
    private stopTween;
    cancel(): void;
    dispose(): void;
    private scrollOffsetFor;
    private pageOffset;
}
