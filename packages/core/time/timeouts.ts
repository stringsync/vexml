import type { Duration } from "./duration";
import type { Timer } from "./timer/timer";

/** Putting a deadline on work that does not take one. */
export class timeouts {
	private constructor() {}

	/**
	 * Resolves `true` if `promise` settles before `timeout` elapses, `false` if
	 * the deadline wins. The work keeps running either way, since a promise
	 * cannot be cancelled: this is how long the caller is willing to wait.
	 */
	static race(
		timer: Timer,
		promise: Promise<unknown>,
		timeout: Duration,
	): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			const deadline = timer.setTimeout(() => resolve(false), timeout);
			const settled = () => {
				deadline.dispose();
				resolve(true);
			};
			promise.then(settled, settled);
		});
	}
}
