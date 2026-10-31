import type { Duration } from "./duration";

export function sleep(duration: Duration): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, duration.ms));
}
