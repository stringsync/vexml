/**
 * A source of calendar time, as Unix epoch milliseconds.
 *
 * Distinct from `Clock`, which counts from an arbitrary origin and so can only
 * say how long something took. Only a wall clock can say when it happened,
 * which is what stamping a row, reading back a stored timestamp or comparing
 * against someone else's (a JWT `exp`, an HTTP `Date`) all need.
 *
 * Measure elapsed time with `Clock` even so: a wall clock steps when the
 * machine syncs with NTP or the user changes it, and a stopwatch should not.
 */
export interface WallClock {
	now(): number;
}
