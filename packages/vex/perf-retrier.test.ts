import { beforeEach, describe, expect, it } from 'bun:test';
import { MemoryLogger } from 'core/log';
import { FakeClock } from 'core/time/testing';
import type { Bench, Measurement } from './perf-bench';
import type { Engine, PerfEvent } from './perf-events';
import { Retrier } from './perf-retrier';
import { PerfRun } from './perf-run';

/** Renders instantly, and remembers what it was asked to render. */
class FakeBench implements Bench {
	readonly measured: string[] = [];

	async measure(fixture: string, engine: Engine): Promise<Measurement> {
		this.measured.push(`${fixture}/${engine}`);
		return { cell: { ms: 1, size: '1x1' }, image: Buffer.from(fixture) };
	}
}

describe('Retrier', () => {
	let run: PerfRun;
	let bench: FakeBench;
	let retrier: Retrier;

	beforeEach(() => {
		run = new PerfRun(new FakeClock());
		run.start(['a', 'b']);
		bench = new FakeBench();
		retrier = new Retrier({ run, bench, log: new MemoryLogger() });
	});

	it('renders a fixture through every engine again', async () => {
		retrier.open();

		retrier.request('a');
		await retrier.idle();

		expect(bench.measured).toEqual(['a/vexml', 'a/osmd', 'a/alphatab']);
	});

	it('tells the page a fixture is queued before its renders arrive', async () => {
		const events: PerfEvent[] = [];
		run.subscribe((event) => events.push(event));
		retrier.open();

		retrier.request('a');
		await retrier.idle();

		expect(events.slice(1).map((event) => event.type)).toEqual([
			'retry',
			'render',
			'render',
			'render',
		]);
	});

	it('holds requests until it is opened', async () => {
		retrier.request('a');
		await retrier.idle();
		expect(bench.measured).toEqual([]);

		retrier.open();
		await retrier.idle();

		expect(bench.measured).toHaveLength(3);
	});

	it('renders a fixture asked for twice only once', async () => {
		retrier.request('a');
		retrier.request('a');
		retrier.open();
		await retrier.idle();

		expect(bench.measured).toHaveLength(3);
	});

	it('works through requests in the order they came', async () => {
		retrier.request('b');
		retrier.request('a');
		retrier.open();
		await retrier.idle();

		expect(bench.measured.map((m) => m.split('/')[0])).toEqual([
			'b',
			'b',
			'b',
			'a',
			'a',
			'a',
		]);
	});

	it('turns down a fixture the run does not have', () => {
		expect(retrier.request('nope')).toBe(false);
	});
});
