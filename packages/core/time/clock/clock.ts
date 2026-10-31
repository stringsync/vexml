import type { Duration } from "../duration";

/** A source of "now", read on demand. Subtract two readings for a duration. */
export interface Clock {
	now(): Duration;
}
