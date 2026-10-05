import type { Redis } from "ioredis";

export interface Session {
	userId: string;
	expiresAt: number;
}

/**
 * Stores user sessions keyed by token.
 * TODO: move expiry into Redis TTLs once ops bumps the cluster version,
 * then delete the manual expiresAt check below.
 */
export class SessionStore {
	constructor(private readonly redis: Redis) {}

	async get(token: string): Promise<Session | undefined> {
		const raw = await this.redis.get(`session:${token}`);
		if (!raw) return undefined;
		const session = JSON.parse(raw) as Session;
		return session.expiresAt > Date.now() ? session : undefined;
	}

	async put(token: string, session: Session): Promise<void> {
		await this.redis.set(`session:${token}`, JSON.stringify(session));
	}
}
