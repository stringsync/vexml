import type { Clock } from "./clock";

export interface RateLimit {
	limit: number;
	windowMs: number;
}

export enum Decision {
	Allow = "allow",
	Deny = "deny",
}

const bucketKey = (client: string, windowStart: number): string =>
	`${client}:${windowStart}`;

export class RateLimiter {
	private readonly counts = new Map<string, number>();

	constructor(
		private readonly clock: Clock,
		private readonly rule: RateLimit,
	) {}

	check(client: string): Decision {
		const now = this.clock.now();
		const key = bucketKey(client, now - (now % this.rule.windowMs));
		const count = (this.counts.get(key) ?? 0) + 1;
		this.counts.set(key, count);
		return count > this.rule.limit ? Decision.Deny : Decision.Allow;
	}
}
