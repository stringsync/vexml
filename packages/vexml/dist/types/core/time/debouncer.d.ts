import type { Resource } from "../disposable/index.js";
import type { Duration } from "./duration.js";
import type { Timer } from "./timer/timer.js";
/**
 * Runs the last function it was given once the calls stop, waiting `delay`
 * after each one. A burst of calls does the work once, at the end.
 *
 * ```ts
 * const debouncer = new Debouncer(new SystemTimer(), Duration.ms(300));
 * input.addEventListener("input", () => debouncer.call(() => search(input.value)));
 * ```
 */
export declare class Debouncer implements Resource {
    private readonly timer;
    private readonly delay;
    private pending;
    private fn;
    constructor(timer: Timer, delay: Duration);
    call(fn: () => void): void;
    /** Runs whatever is waiting right now, if anything. */
    flush(): void;
    /** Drops whatever is waiting, unrun. */
    cancel(): void;
    dispose(): void;
}
