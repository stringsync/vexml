import type { Resource } from 'webappwiz/disposable';
import type { Eventful } from 'webappwiz/events';
import type { Rect } from 'webappwiz/geometry';

/* The host fires this whenever the viewport moves or resizes, so the cursor can re-test visibility
 * even though it hasn't moved. Payload-free — the cursor reads viewportRect()/clientRectOf() itself. */
export type CursorHostEventMap = {
	viewportchange: undefined;
};

/* What a CursorController needs from the rendered score's stage: score<->client mapping (to expose
 * the bar's page rect and test visibility), the visible scrollport box, and a viewport-change
 * subscription. CursorHostAdapter implements it over the Stage; a unit test injects a fake.
 *
 * The cursor disposes the host it was given: one is made per cursor, so its subscriptions to the
 * page should end with it. */
export interface CursorHost extends Eventful<CursorHostEventMap>, Resource {
	clientRectOf(rect: Rect): DOMRect;
	viewportRect(): DOMRect;
}
