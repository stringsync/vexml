import type { Rect } from '../core/geometry/index.js';
export interface ScrollerOptions {
    behavior?: ScrollBehavior;
    block?: 'nearest' | 'start';
}
export interface Scroller {
    scrollIntoView(rect: Rect, opts?: ScrollerOptions): void;
}
