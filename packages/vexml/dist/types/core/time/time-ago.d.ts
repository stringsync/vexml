import type { Duration } from "./duration.js";
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
export declare function timeAgo(elapsed: Duration): string;
