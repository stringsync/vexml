import { Dispatcher } from 'webappwiz/events';
import { Rect } from 'webappwiz/geometry';
import type { CursorHost, CursorHostEventMap } from './cursor-host';

/* Fake fulfilling the CursorHost seam (preferred over mocks); score space maps 1:1 onto client
 * space, so a test asserts on the rect it passed in. `moveViewport` stands in for the scroll or
 * resize a real stage would report. Test-only — excluded from the published package via
 * package.json "files". */
export class FakeCursorHost implements CursorHost {
	private readonly dispatcher = new Dispatcher<CursorHostEventMap>();
	readonly events = this.dispatcher.events;

	/* True once the cursor holding this disposed. */
	disposed = false;

	/* The visible box, in the same identity coords clientRectOf maps to. Large enough by default
	 * that a cursor anywhere in a test score reads as fully visible. */
	vp = new Rect(0, 0, 1000, 1000);

	clientRectOf(rect: Rect): DOMRect {
		return {
			x: rect.x,
			y: rect.y,
			width: rect.w,
			height: rect.h,
			left: rect.x,
			top: rect.y,
			right: rect.right,
			bottom: rect.bottom,
		} as DOMRect;
	}

	viewportRect(): DOMRect {
		return this.clientRectOf(this.vp);
	}

	dispose(): void {
		this.disposed = true;
		this.dispatcher.dispose();
	}

	/* Move the viewport and notify, as a real scroll or resize would. */
	moveViewport(rect: Rect): void {
		this.vp = rect;
		this.dispatcher.dispatch('viewportchange');
	}
}
