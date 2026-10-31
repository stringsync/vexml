import type { Resource } from "core/disposable";
import type { Clock, Duration } from "core/time";

/**
 * A frame that has been asked for: await `promise` for it to run, or dispose
 * it to give it up. Disposing does nothing once the callback has started.
 */
export interface Frame extends Resource {
	/** Resolves once the callback has run, or once the frame is disposed. */
	promise: Promise<void>;
}

/**
 * Runs `callback` on the next animation frame, handing it how long it waited.
 *
 * ```ts
 * const frame = raf(clock, (dt) => advance(dt));
 * await frame.promise;
 * ```
 */
// scry-ignore objects-over-callbacks: the work to run on the frame, which is what requestAnimationFrame itself takes
export function raf(
	clock: Clock,
	callback: (dt: Duration) => void | Promise<void>,
): Frame {
	const started = clock.now();
	let resolve!: () => void;
	const promise = new Promise<void>((settle) => {
		resolve = settle;
	});

	let id: number | null = requestAnimationFrame(() => {
		id = null;
		const result = callback(clock.now().subtract(started));
		if (result === undefined) {
			resolve();
			return;
		}
		void result.then(resolve);
	});

	return {
		promise,
		dispose: () => {
			if (id === null) {
				return;
			}
			cancelAnimationFrame(id);
			id = null;
			resolve();
		},
	};
}
