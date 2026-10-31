import type { Duration } from "./duration";

/**
 * How long ago something was, in words: "just now", "5 minutes ago",
 * "3 hours ago", "2 days ago".
 *
 * ```ts
 * timeAgo(Duration.ms(wall.now() - row.createdAt));
 * ```
 *
 * The unit climbs with the gap, and anything within five seconds reads as "just
 * now". A negative duration, which a clock correction can produce, also reads
 * as "just now" rather than as the future.
 */
export function timeAgo(elapsed: Duration): string {
	const seconds = Math.max(0, Math.floor(elapsed.secs));
	if (seconds < 5) {
		return "just now";
	}
	if (seconds < 60) {
		return plural(seconds, "second");
	}
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) {
		return plural(minutes, "minute");
	}
	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return plural(hours, "hour");
	}
	return plural(Math.floor(hours / 24), "day");
}

function plural(count: number, unit: string): string {
	return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}
