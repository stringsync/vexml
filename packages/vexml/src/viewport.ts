import type { Rect } from 'webappwiz/geometry';

/*
 * The coordinate authority: converts between score space (where rects live) and client/page
 * space (where pointer events and DOM popups live). Stage implements it for real; tests
 * inject a FakeViewport.
 */
export interface Viewport {
	clientRectOf(rect: Rect): DOMRect;
	toScoreSpace(clientX: number, clientY: number): { x: number; y: number };
}
