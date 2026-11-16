import type { Resource } from "../disposable/index.js";
import type { Duration } from "./duration.js";
import type { Timer } from "./timer/timer.js";
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
export declare class Throttler implements Resource {
    private readonly timer;
    private readonly interval;
    private pending;
    private fn;
    constructor(timer: Timer, interval: Duration);
    call(fn: () => void): void;
    /** Runs whatever is waiting right now, if anything. */
    flush(): void;
    /** Drops whatever is waiting, unrun. */
    cancel(): void;
    dispose(): void;
}
