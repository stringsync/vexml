import type { Duration } from "./duration.js";
import type { Timer } from "./timer/timer.js";
/** Putting a deadline on work that does not take one. */
export declare class timeouts {
    private constructor();
    /**
     * Resolves `true` if `promise` settles before `timeout` elapses, `false` if
     * the deadline wins. The work keeps running either way, since a promise
     * cannot be cancelled: this is how long the caller is willing to wait.
     */
    static race(timer: Timer, promise: Promise<unknown>, timeout: Duration): Promise<boolean>;
}
