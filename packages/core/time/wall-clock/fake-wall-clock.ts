import type { Duration } from "../duration";
import type { WallClock } from "./wall-clock";

/** A `WallClock` the test moves itself, so nothing depends on today's date. */
export class FakeWallClock implements WallClock {
	private current: number;

	constructor(start = 0) {
		this.current = start;
	}

	now(): number {
		return this.current;
	}

	advance(duration: Duration): void {
		this.current += duration.ms;
	}

	set(epochMs: number): void {
		this.current = epochMs;
	}
}
