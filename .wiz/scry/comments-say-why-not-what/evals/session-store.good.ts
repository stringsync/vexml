import type { Redis } from "ioredis";

export class SessionStore {
	constructor(private redis: Redis) {}

	async load(id: string): Promise<Session | undefined> {
		const raw = await this.redis.get(`session:${id}`);
		if (!raw) return undefined;
		const session = JSON.parse(raw) as Session;
		// sliding expiry: users on long forms were being logged out mid-edit
		await this.redis.expire(`session:${id}`, 60 * 30);
		return session;
	}

	async save(session: Session): Promise<void> {
		// SET with EX in one call, so a crash between two calls cannot leave a session that never expires
		await this.redis.set(`session:${session.id}`, JSON.stringify(session), "EX", 60 * 30);
	}
}

export interface Session {
	id: string;
	userId: string;
}
