import type { Queue } from "./queue.ts";

const backoff = (attempt: number): number => Math.min(60_000, 1000 * 2 ** attempt);

export class JobScheduler {
	constructor(private queue: Queue) {}

	async schedule(name: string, payload: unknown): Promise<void> {
		await this.queue.push({ name, payload, attempt: 0, runAt: Date.now() });
	}

	async retry(job: { name: string; payload: unknown; attempt: number }): Promise<void> {
		const attempt = job.attempt + 1;
		await this.queue.push({ ...job, attempt, runAt: Date.now() + backoff(attempt) });
	}
}
