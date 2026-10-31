import type { Lock } from "./lock";

/**
 * A mutex between callers inside one process, held by nothing but this object.
 * Contenders have to share the instance, since there is no path or pid for a
 * second one to find. Waiters are served in the order they arrived.
 */
export class MemoryLock implements Lock {
	private tail: Promise<void> = Promise.resolve();
	private handOff: (() => void) | null = null;

	async acquire(): Promise<void> {
		// Each waiter parks on the promise left by the waiter ahead of it, which
		// is what makes the queue first-come-first-served.
		const { promise, resolve } = Promise.withResolvers<void>();
		const ahead = this.tail;
		this.tail = promise;
		await ahead;
		this.handOff = resolve;
	}

	release(): Promise<void> {
		this.handOff?.();
		this.handOff = null;
		return Promise.resolve();
	}

	releaseIfOurs(): Promise<void> {
		return this.release();
	}
}
