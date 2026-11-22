import type { Rect } from '../core/geometry/index.js';
import { type Clock, type Timer } from '../core/time/index.js';
import type { ScrollHost } from './scroll-host.js';
import type { Scroller, ScrollerOptions } from './scroller.js';
export declare class ScrollController implements Scroller {
    private readonly host;
    private readonly timer;
    private readonly clock;
    private tween;
    private frameTimer;
    private resizeSettleTimer;
    constructor(host: ScrollHost, timer?: Timer, clock?: Clock);
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
