import { type Resource } from '../core/disposable/index.js';
import type { Rect } from '../core/geometry/index.js';
import type { CursorHost, CursorHostEventMap } from './cursor-host.js';
import type { Host } from './host.js';
export declare class CursorHostAdapter implements CursorHost, Resource {
    private readonly host;
    private readonly dispatcher;
    readonly events: import("../core/events/index.js").Events<CursorHostEventMap>;
    private readonly observers;
    constructor(host: Host);
    clientRectOf(rect: Rect): DOMRect;
    viewportRect(): DOMRect;
    dispose(): void;
}
