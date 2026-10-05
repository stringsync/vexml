export class RateLimiter {
	private hits = new Map<string, number[]>();

	constructor(
		private limit: number,
		private windowMs: number,
	) {}

	allow(key: string, now = Date.now()): boolean {
		// a sliding log rather than a fixed window: fixed windows let a client
		// send twice the limit across a boundary, which the billing API rejects
		const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
		if (recent.length >= this.limit) {
			this.hits.set(key, recent);
			return false;
		}
		recent.push(now);
		this.hits.set(key, recent);
		return true;
	}
}
