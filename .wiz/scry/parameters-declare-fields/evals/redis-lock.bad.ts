import type { RedisClient } from "./redis";

export class RedisLock {
	private readonly redis: RedisClient;
	private readonly prefix: string;

	constructor(redis: RedisClient, prefix: string) {
		this.redis = redis;
		this.prefix = prefix.endsWith(":") ? prefix : `${prefix}:`;
	}

	async acquire(name: string, ttlMs: number): Promise<boolean> {
		const result = await this.redis.set(`${this.prefix}${name}`, "1", {
			PX: ttlMs,
			NX: true,
		});
		return result === "OK";
	}
}
