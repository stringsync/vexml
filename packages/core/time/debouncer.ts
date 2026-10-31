import type { Resource } from "core/disposable";
import type { Duration } from "./duration";
import type { Timer } from "./timer/timer";

/**
 * Runs the last function it was given once the calls stop, waiting `delay`
 * after each one. A burst of calls does the work once, at the end.
 *
 * ```ts
 * const debouncer = new Debouncer(new SystemTimer(), Duration.ms(300));
 * input.addEventListener("input", () => debouncer.call(() => search(input.value)));
 * ```
 */
export class Debouncer implements Resource {
	private pending: Resource | null = null;
	private fn: (() => void) | null = null;

	constructor(
		private readonly timer: Timer,
		private readonly delay: Duration,
	) {}

	call(fn: () => void): void {
		this.cancel();
		this.fn = fn;
		this.pending = this.timer.setTimeout(() => {
			this.fn = null;
			this.pending = null;
			fn();
		}, this.delay);
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
