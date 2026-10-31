import type { Resource } from "core/disposable";
import type { Clock } from "./clock/clock";
import { Duration } from "./duration";

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
export class Stopwatch implements Resource {
	private accumulated = Duration.zero();
	private runningSince: Duration | null = null;

	constructor(private readonly clock: Clock) {}

	elapsed(): Duration {
		if (this.runningSince === null) {
			return this.accumulated;
		}
		return this.accumulated.add(this.clock.now().subtract(this.runningSince));
	}

	isRunning(): boolean {
		return this.runningSince !== null;
	}

	/** Starts from zero, discarding anything a previous run accrued. */
	start(): void {
		this.accumulated = Duration.zero();
		this.runningSince = this.clock.now();
	}

	/** Pauses, keeping what has accrued so far. */
	stop(): void {
		if (this.runningSince === null) {
			return;
		}
		this.accumulated = this.elapsed();
		this.runningSince = null;
	}

	/** Carries on from where `stop` left off. */
	resume(): void {
		this.runningSince ??= this.clock.now();
	}

	dispose(): void {
		this.stop();
	}
}
