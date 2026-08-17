import type { Rect } from '../../geometry';
import type { Host } from '../../host/host/host';
import { EventTarget } from '../../listenable/event-target';
import type { CursorHost, CursorHostEventMap } from './cursor-host';

/* Adapts the Stage host into a CursorController's CursorHost: passes through the rect methods and
 * turns the host's window-scroll + resize observers into a single `viewportchange` event. One per
 * cursor; the observers are bound only while the cursor is listening and torn down when it disposes
 * (its removeEventListener drops the last listener). */
export class CursorHostAdapter implements CursorHost {
	private readonly target = new EventTarget<CursorHostEventMap>();
	private unbind: (() => void) | null = null;

	constructor(private readonly host: Host) {}

	clientRectOf(rect: Rect): DOMRect {
		return this.host.clientRectOf(rect);
	}

	viewportRect(): DOMRect {
		return this.host.viewportRect();
	}

	addEventListener<K extends keyof CursorHostEventMap>(
		type: K,
		listener: (event: CursorHostEventMap[K]) => void,
	): void {
		this.target.addEventListener(type, listener);
		if (!this.unbind) {
			const fire = () => this.target.dispatchEvent('viewportchange', undefined);
			const offScroll = this.host.observeScroll(fire);
			const offResize = this.host.observeResize(fire);
			this.unbind = () => {
				offScroll();
				offResize();
			};
		}
	}

	removeEventListener<K extends keyof CursorHostEventMap>(
		type: K,
		listener: (event: CursorHostEventMap[K]) => void,
	): void {
		this.target.removeEventListener(type, listener);
		if (this.target.count('viewportchange') === 0) {
			this.unbind?.();
			this.unbind = null;
		}
	}
}
