export interface Listenable<M extends Record<keyof M, unknown>> {
	addEventListener<K extends keyof M>(
		type: K,
		listener: (event: M[K]) => void,
	): void;

	removeEventListener<K extends keyof M>(
		type: K,
		listener: (event: M[K]) => void,
	): void;
}

type Listener<M, K extends keyof M> = (event: M[K]) => void;

export class EventTarget<M extends Record<keyof M, unknown>>
	implements Listenable<M>
{
	private readonly listeners: { [K in keyof M]?: Set<Listener<M, K>> } = {};

	addEventListener<K extends keyof M>(type: K, listener: Listener<M, K>): void {
		this.listeners[type] ??= new Set();
		this.listeners[type]?.add(listener);
	}

	removeEventListener<K extends keyof M>(
		type: K,
		listener: Listener<M, K>,
	): void {
		this.listeners[type]?.delete(listener);
	}

	dispatchEvent<K extends keyof M>(type: K, event: M[K]): void {
		const listeners = this.listeners[type];
		if (!listeners) {
			return;
		}
		for (const listener of [...listeners]) {
			listener(event);
		}
	}

	count<K extends keyof M>(type: K): number {
		return this.listeners[type]?.size ?? 0;
	}
}
