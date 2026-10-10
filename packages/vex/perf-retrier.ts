import type { Logger } from 'webappwiz/log';
import { format } from './perf';
import type { Bench } from './perf-bench';
import { ENGINES } from './perf-events';
import type { PerfRun } from './perf-run';

/** Where the page's retry button lands. */
export interface RetryQueue {
	/** Queues the fixture to render again; false when the run has no such fixture. */
	request(fixture: string): boolean;
}

/**
 * Renders fixtures again on request, one at a time, through the same bench as the run.
 * Requests wait for open(), which comes once the run is over: a retry rendering beside the
 * run would skew both their times.
 */
export class Retrier implements RetryQueue {
	readonly #run: PerfRun;
	readonly #bench: Bench;
	readonly #log: Logger;
	readonly #queue: string[] = [];
	#open = false;
	#draining: Promise<void> | undefined;

	constructor(opts: RetrierOptions) {
		this.#run = opts.run;
		this.#bench = opts.bench;
		this.#log = opts.log;
	}

	request(fixture: string): boolean {
		if (!this.#run.has(fixture)) {
			return false;
		}
		// Asking twice before the first is done would only render it twice for nothing.
		if (!this.#queue.includes(fixture)) {
			this.#queue.push(fixture);
			this.#run.retry(fixture);
			this.#drain();
		}
		return true;
	}

	/** Starts on the queue, and on every request after. */
	open() {
		this.#open = true;
		this.#drain();
	}

	/** Resolves once every request so far has rendered. */
	async idle(): Promise<void> {
		while (this.#draining) {
			await this.#draining;
		}
	}

	#drain() {
		if (!this.#open || this.#draining) {
			return;
		}
		this.#draining = this.#work().finally(() => {
			this.#draining = undefined;
			// A request that landed as the last render finished would otherwise sit unserved.
			if (this.#queue.length > 0) {
				this.#drain();
			}
		});
	}

	async #work() {
		// Peeked rather than shifted, so a request for the fixture under way is still a no-op.
		for (let fixture = this.#queue[0]; fixture; fixture = this.#queue[0]) {
			for (const engine of ENGINES) {
				const { cell, image } = await this.#bench.measure(fixture, engine);
				this.#run.render(fixture, engine, cell, image);
				this.#log.info(
					`[retry] ${fixture}  ${engine.padEnd(8)}  ${format(cell)}`,
				);
			}
			this.#queue.shift();
		}
	}
}

export interface RetrierOptions {
	/** Where the retried renders go, and which fixtures can be retried. */
	run: PerfRun;
	/** The run's own bench, so a retry renders as warm as the run did. */
	bench: Bench;
	log: Logger;
}
