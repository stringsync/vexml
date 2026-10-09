import type { Rect } from 'webappwiz/geometry';
import type { Viewport } from './viewport';

/*
 * The viewport of a score engraved with no page to show it on (createSnapshot): its elements are
 * built only to be recorded, never asked where they are on screen.
 */
export class DetachedViewport implements Viewport {
	clientRectOf(_rect: Rect): DOMRect {
		throw new Error('vexml: a score engraved with no DOM is not on a page');
	}

	toScoreSpace(_clientX: number, _clientY: number): { x: number; y: number } {
		throw new Error('vexml: a score engraved with no DOM is not on a page');
	}
}
