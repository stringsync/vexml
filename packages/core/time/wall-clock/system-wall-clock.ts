import type { WallClock } from "./wall-clock";

export class SystemWallClock implements WallClock {
	now(): number {
		return Date.now();
	}
}
