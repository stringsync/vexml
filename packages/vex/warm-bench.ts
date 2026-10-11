import type { Bench, Measurement } from './perf-bench';
import type { Engine } from './perf-events';

/**
 * A bench whose first measure through each engine is a real one, not the engine's start-up.
 * Wrap the bench a run times through; the first time it is asked for an engine, it renders
 * that fixture once untimed and discards it, then measures.
 */
export class WarmBench implements Bench {
	readonly #bench: Bench;
	readonly #warm = new Set<Engine>();

	constructor(bench: Bench) {
		this.#bench = bench;
	}

	async measure(fixture: string, engine: Engine): Promise<Measurement> {
		// An engine's first render pays once for the browser launch, bundling its page, and
		// opening and loading a tab: about 600ms for vexml (which launches the browser) and
		// 200ms for the others, against about 40ms warm. Any fixture warms it; this one is
		// to hand.
		if (!this.#warm.has(engine)) {
			this.#warm.add(engine);
			await this.#bench.measure(fixture, engine);
		}
		return this.#bench.measure(fixture, engine);
	}
}
