import type { Resource } from "core/disposable";
import type { Duration } from "./duration";
import type { Timer } from "./timer/timer";

/**
 * Runs the first function it is given straight away, then at most one more per
 * `interval`. Where a `Debouncer` waits for a burst to end, this one keeps
 * something happening throughout it.
 *
 * ```ts
 * const throttler = new Throttler(new SystemTimer(), Duration.ms(100));
 * window.addEventListener("scroll", () => throttler.call(() => reposition()));
 * ```
 */
export class Throttler implements Resource {
	private pending: Resource | null = null;
	private fn: (() => void) | null = null;

	constructor(
		private readonly timer: Timer,
		private readonly interval: Duration,
	) {}

	call(fn: () => void): void {
		if (this.pending !== null) {
			this.fn = fn;
			return;
		}

		fn();

		this.pending = this.timer.setTimeout(() => {
			const queued = this.fn;
			this.fn = null;
			this.pending = null;
			if (queued !== null) {
				this.call(queued);
			}
		}, this.interval);
	}

	/** Runs whatever is waiting right now, if anything. */
	flush(): void {
		const fn = this.fn;
		this.cancel();
		fn?.();
	}

	/** Drops whatever is waiting, unrun. */
	cancel(): void {
		this.pending?.dispose();
		this.pending = null;
		this.fn = null;
	}

	dispose(): void {
		this.cancel();
	}
}
