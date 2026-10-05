import type { Clock } from "./clock";
import { SystemClock } from "./clock";
import type { Store } from "./store";

export interface JobQueueOptions {
	concurrency?: number;
	clock?: Clock;
}

export class JobQueue {
	private readonly clock: Clock;
	private readonly concurrency: number;

	constructor(
		private readonly store: Store,
		opts: JobQueueOptions = {},
	) {
		this.clock = opts.clock ?? new SystemClock();
		this.concurrency = opts.concurrency ?? 4;
	}

	async enqueue(name: string, payload: unknown): Promise<void> {
		await this.store.push({ name, payload, at: this.clock.now() });
	}
}
