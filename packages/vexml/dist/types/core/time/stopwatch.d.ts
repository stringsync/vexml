import type { Resource } from "../disposable/index.js";
import type { Clock } from "./clock/clock.js";
import { Duration } from "./duration.js";
/**
 * Elapsed time that can be paused, for measuring how long something took while
 * leaving out the parts that should not count: a dialog the user left open, a
 * run they paused, a tab that went to the background.
 *
 * ```ts
 * const stopwatch = new Stopwatch(clock);
 * stopwatch.start();
 * stopwatch.stop(); // pauses, keeping what has accrued
 * stopwatch.resume();
 * stopwatch.elapsed(); // total, minus the pauses
 * ```
 *
 * It reads a `Clock` rather than a `WallClock`, so it is unmoved by the machine
 * syncing its date.
 */
export declare class Stopwatch implements Resource {
    private readonly clock;
    private accumulated;
    private runningSince;
    constructor(clock: Clock);
    elapsed(): Duration;
    isRunning(): boolean;
    /** Starts from zero, discarding anything a previous run accrued. */
    start(): void;
    /** Pauses, keeping what has accrued so far. */
    stop(): void;
    /** Carries on from where `stop` left off. */
    resume(): void;
    dispose(): void;
}
