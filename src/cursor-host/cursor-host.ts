import type { Rect } from '../geometry';
import type { Listenable } from '../listenable/listenable';

/* The host fires this whenever the viewport moves or resizes, so the cursor can re-test visibility
 * even though it hasn't moved. Payload-free — the cursor reads viewportRect()/clientRectOf() itself. */
export interface CursorHostEventMap {
	viewportchange: undefined;
}

/* What a CursorController needs from the rendered score's stage: score<->client mapping (to expose
 * the bar's page rect and test visibility), the visible scrollport box, and a viewport-change
 * subscription. CursorHostAdapter implements it over the Stage; a unit test injects a fake. */
export interface CursorHost extends Listenable<CursorHostEventMap> {
	clientRectOf(rect: Rect): DOMRect;
	viewportRect(): DOMRect;
}
