import { Duration } from "../duration";
import type { Clock } from "./clock";

export class SystemClock implements Clock {
	now(): Duration {
		return Duration.ms(performance.now());
	}
}
