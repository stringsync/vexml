import type { Resource } from '../core/disposable/index.js';
import type { Eventful } from '../core/events/index.js';
import type { Rect } from '../core/geometry/index.js';
export type CursorHostEventMap = {
    viewportchange: undefined;
};
export interface CursorHost extends Eventful<CursorHostEventMap>, Resource {
    clientRectOf(rect: Rect): DOMRect;
    viewportRect(): DOMRect;
}
