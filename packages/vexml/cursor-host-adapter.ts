import { Disposer, type Resource } from 'webappwiz/disposable';
import { Dispatcher } from 'webappwiz/events';
import type { Rect } from 'webappwiz/geometry';
import type { CursorHost, CursorHostEventMap } from './cursor-host';
import type { Host } from './host';

/* Adapts the Stage host into a CursorController's CursorHost: passes through the rect methods and
 * turns the host's window-scroll + resize observers into a single `viewportchange` event. One per
 * cursor, and the cursor disposes it — the observers live exactly as long as the cursor watching
 * them. */
export class CursorHostAdapter implements CursorHost, Resource {
	private readonly dispatcher = new Dispatcher<CursorHostEventMap>();
	readonly events = this.dispatcher.events;

	private readonly observers = new Disposer();

	constructor(private readonly host: Host) {
		const fire = () => this.dispatcher.dispatch('viewportchange');
		this.observers.use(host.observeScroll(fire));
		this.observers.use(host.observeResize(fire));
		this.observers.use(this.dispatcher);
	}

	clientRectOf(rect: Rect): DOMRect {
		return this.host.clientRectOf(rect);
	}

	viewportRect(): DOMRect {
		return this.host.viewportRect();
	}

	dispose(): void {
		this.observers.dispose();
	}
}
