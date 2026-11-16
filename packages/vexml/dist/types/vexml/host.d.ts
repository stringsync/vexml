import type { Resource } from '../core/disposable/index.js';
import type { Eventful } from '../core/events/index.js';
import type { LayerHost } from './layer-host.js';
import type { LoupeHost } from './loupe.js';
import type { MarkerHost } from './marker.js';
import type { Scroller } from './scroller.js';
import type { Viewport } from './viewport.js';
export type HostEventMap = {
    resize: {
        width: number;
        height: number;
    };
    scroll: undefined;
};
export interface Host extends LayerHost, MarkerHost, LoupeHost, Viewport, Eventful<HostEventMap>, Resource {
    readonly dom: EventTarget;
    readonly scrollTarget: EventTarget;
    readonly scroll: {
        left: number;
        top: number;
    };
    viewportRect(): DOMRect;
    obscures(clientX: number, clientY: number): boolean;
    readonly scroller: Scroller;
    relayoutLayers(): void;
    setMaxHeight(px: number | null): void;
}
