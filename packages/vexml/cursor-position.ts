import type { Rect } from 'webappwiz/geometry';
import type { CursorHost } from './cursor-host';
import type { Bounded } from './decoration';

/* The cursor's current box, mapped to the page on demand (mirrors an element's Bounded). */
export class CursorPosition implements Bounded {
	constructor(
		readonly rect: Rect,
		private readonly host: CursorHost,
	) {}
	getBoundingClientRect(): DOMRect {
		return this.host.clientRectOf(this.rect);
	}
}
