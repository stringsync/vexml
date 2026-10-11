import { beforeEach, describe, expect, it } from 'bun:test';
import type { Bench, Measurement } from './perf-bench';
import type { Engine } from './perf-events';
import { WarmBench } from './warm-bench';

/** Answers each measure with its call count as the time, and remembers what it was asked. */
class FakeBench implements Bench {
	readonly measured: string[] = [];

	async measure(fixture: string, engine: Engine): Promise<Measurement> {
		this.measured.push(`${fixture}/${engine}`);
		return { cell: { ms: this.measured.length, size: '1x1' } };
	}
}

describe('WarmBench', () => {
	let bench: FakeBench;
	let warm: WarmBench;

	beforeEach(() => {
		bench = new FakeBench();
		warm = new WarmBench(bench);
	});

	it('renders an engine once before its first measure, and reports the second', async () => {
		const { cell } = await warm.measure('a', 'vexml');

		expect(bench.measured).toEqual(['a/vexml', 'a/vexml']);
		expect(cell).toEqual({ ms: 2, size: '1x1' });
	});

	it('warms each engine once, not every measure', async () => {
		await warm.measure('a', 'vexml');
		await warm.measure('b', 'vexml');

		expect(bench.measured).toEqual(['a/vexml', 'a/vexml', 'b/vexml']);
	});

	it('warms every engine on its own first measure', async () => {
		await warm.measure('a', 'vexml');
		await warm.measure('a', 'osmd');

		expect(bench.measured).toEqual(['a/vexml', 'a/vexml', 'a/osmd', 'a/osmd']);
	});
});
