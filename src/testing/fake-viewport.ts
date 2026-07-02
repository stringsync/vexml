import type { Rect } from '../geometry';
import type { Viewport } from '../host/stage';

/* Fake fulfilling the Viewport seam (preferred over mocks). Test-only — excluded from the
 * published package via package.json "files". */

export class FakeViewport implements Viewport {
	clientRectOf(rect: Rect): DOMRect {
		// bun's runtime has no DOMRect; a structural literal is enough for unit reads.
		return {
			x: rect.x,
			y: rect.y,
			width: rect.w,
			height: rect.h,
			top: rect.y,
			left: rect.x,
			right: rect.right,
			bottom: rect.bottom,
			toJSON: () => ({}),
		} as DOMRect;
	}
	toScoreSpace(clientX: number, clientY: number): { x: number; y: number } {
		return { x: clientX, y: clientY };
	}
}
