import { Disposer, type Resource } from 'webappwiz/disposable';
import type { Rect } from '../../geometry';
import type { Host } from '../../host/host/host';
import { EventTarget } from '../../listenable/event-target';
import type { CursorHost, CursorHostEventMap } from './cursor-host';

/* Adapts the Stage host into a CursorController's CursorHost: passes through the rect methods and
 * turns the host's window-scroll + resize observers into a single `viewportchange` event. One per
 * cursor; the observers are bound only while the cursor is listening and released when the last
 * listener goes (or on dispose, for a caller that would rather not rely on that). */
export class CursorHostAdapter implements CursorHost, Resource {
	private readonly target = new EventTarget<CursorHostEventMap>();
	// The two host subscriptions, held only while something is listening. Null when unbound.
	private observers: Disposer | null = null;

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
		if (!this.observers) {
			const fire = () => this.target.dispatchEvent('viewportchange', undefined);
			const observers = new Disposer();
			observers.use(this.host.observeScroll(fire));
			observers.use(this.host.observeResize(fire));
			this.observers = observers;
		}
	}

	removeEventListener<K extends keyof CursorHostEventMap>(
		type: K,
		listener: (event: CursorHostEventMap[K]) => void,
	): void {
		this.target.removeEventListener(type, listener);
		if (this.target.count('viewportchange') === 0) {
			this.dispose();
		}
	}

	/* Releases the two host subscriptions. Safe to call twice, and safe to keep using the
	 * adapter afterwards: a later addEventListener re-binds them. */
	dispose(): void {
		this.observers?.dispose();
		this.observers = null;
	}
}
