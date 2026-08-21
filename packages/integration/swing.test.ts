import { describe, expect, it } from 'bun:test';
import { scores } from './setup';

describe('swing', () => {
	/*
	 * <sound><swing> end to end: parse, engrave, and read the built timeline back. The warp math
	 * and the reader are unit-tested in packages/vexml; what this pins is the wiring in between,
	 * and specifically the pickup, whose phase depends on the measure resolving a real meter.
	 *
	 * The fixture is a one-eighth pickup plus six eighths in 3/4 at quarter=60 (1000ms a quarter),
	 * swung 2:1. So the pair boundaries stay on the second: the off-beat eighths land a third of
	 * the way late, and the pickup — which IS an off-beat — plays short rather than long.
	 */
	it.concurrent('a 2:1 <swing> lengthens the on-beat eighths and shortens the off-beats', async () => {
		const { result } = await scores.probe('swing.musicxml', {}, (score) => ({
			steps: score
				.getSequence()
				.getSteps()
				.map((step) => Math.round(step.startMs)),
			durationMs: Math.round(score.getDurationMs()),
		}));

		// Downbeats stay put at whole seconds; each off-beat sits 2/3 of the way through its pair.
		// The 4333/4667 pair is M2's written-out TRIPLET, which divides its beat evenly (4000 ->
		// 5000 in even thirds) instead of swinging: it is already notated with the swing feel, and
		// swinging it again would land it on neither an even triplet nor a swung pair.
		expect(result.steps).toEqual([
			0, 333, 1000, 1333, 2000, 2333, 3000, 3333, 4000, 4333, 4667, 5000, 5333,
			6000,
		]);
		// Straight, the pickup would be 500ms. Swung it is 333ms, and the two full bars stay
		// 3000ms each — swing moves notes within a bar, never the barlines.
		expect(result.durationMs).toBe(6333);
	});
});
