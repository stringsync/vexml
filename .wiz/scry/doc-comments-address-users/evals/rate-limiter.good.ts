/**
 * Caps how often a caller may run an action within a sliding window.
 * Limits are per process: two servers each allow the full rate.
 */
export class RateLimiter {
	private readonly hits: number[] = [];

	constructor(
		private readonly limit: number,
		private readonly windowMs: number,
	) {}

	/** Returns true and records a hit if the caller is under the limit. */
	tryAcquire(now: number = Date.now()): boolean {
		// Hits stay sorted by time, so dropping from the front is enough.
		// A ring buffer would avoid the shift, but windows here stay small.
		while (this.hits.length > 0 && this.hits[0]! <= now - this.windowMs) {
			this.hits.shift();
		}
		if (this.hits.length >= this.limit) return false;
		this.hits.push(now);
		return true;
	}
}
