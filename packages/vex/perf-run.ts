import type { Image } from '@vexml/renderer';
import type { Clock, Duration } from 'webappwiz/time';
import type { PerfListener } from './perf';
import type { Cell, Engine, PerfEvent } from './perf-events';

/**
 * The run as the page sees it: every event so far, and the PNGs they point at. Held
 * whole, so a page opened or reloaded part way through catches up rather than starting
 * blank.
 */
export class PerfRun implements PerfListener {
	readonly #clock: Clock;
	readonly #events: PerfEvent[] = [];
	readonly #images = new Map<string, Image>();
	readonly #subscribers = new Set<(event: PerfEvent) => void>();
	#started: Duration | undefined;

	constructor(clock: Clock) {
		this.#clock = clock;
	}

	start(fixtures: string[]) {
		this.#started = this.#clock.now();
		this.#emit({ type: 'start', at: 0, fixtures });
	}

	render(fixture: string, engine: Engine, cell: Cell, image?: Image) {
		if (image) {
			this.#images.set(key(fixture, engine), image);
		}
		this.#emit({ type: 'render', at: this.#at(), fixture, engine, cell });
	}

	done() {
		this.#emit({ type: 'done', at: this.#at() });
	}

	/** Replays every event so far to fn, then hands it each new one until unsubscribed. */
	subscribe(fn: (event: PerfEvent) => void): () => void {
		for (const event of this.#events) {
			fn(event);
		}
		this.#subscribers.add(fn);
		return () => this.#subscribers.delete(fn);
	}

	image(fixture: string, engine: Engine): Image | undefined {
		return this.#images.get(key(fixture, engine));
	}

	#at(): number {
		return this.#started ? this.#clock.now().ms - this.#started.ms : 0;
	}

	#emit(event: PerfEvent) {
		this.#events.push(event);
		for (const fn of this.#subscribers) {
			fn(event);
		}
	}
}

function key(fixture: string, engine: Engine): string {
	return `${fixture}/${engine}`;
}
