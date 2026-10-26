import { describe, expect, it } from 'bun:test';
import { testing } from './setup';

describe('swing', () => {
	/*
	 * <sound><swing> end to end: parse, engrave, and read the built timeline back. The warp math
	 * and the reader are unit-tested in packages/vexml; what this pins is the wiring in between,
	 * and specifically the pickup, whose phase depends on the measure resolving a real meter.
	 *
	 * The fixture is a one-eighth pickup plus six eighths in 3/4 at quarter=60 (1000ms a quarter),
	 * swung 2:1. So the pair boundaries stay on the second: the off-beat eighths land a third of
	 * the way late, and the pickup (which IS an off-beat) plays short rather than long.
	 */
	it.concurrent('a 2:1 <swing> lengthens the on-beat eighths and shortens the off-beats', async () => {
		const { result } = await testing.eval(
			'swing.musicxml',
			{},
			({ score }) => ({
				steps: score
					.getSequence()
					.getSteps()
					.map((step) => Math.round(step.startMs)),
				durationMs: Math.round(score.getDurationMs()),
			}),
		);

		// Downbeats stay put at whole seconds; each off-beat sits 2/3 of the way through its pair.
		// The 4333/4667 pair is M2's written-out TRIPLET, which divides its beat evenly (4000 ->
		// 5000 in even thirds) instead of swinging: it is already notated with the swing feel, and
		// swinging it again would land it on neither an even triplet nor a swung pair.
		expect(result.steps).toEqual([
			0, 333, 1000, 1333, 2000, 2333, 3000, 3333, 4000, 4333, 4667, 5000, 5333,
			6000,
			// M3's <straight/> cancels the carried swing: six even eighths, 500ms apart.
			6333,
			6833, 7333, 7833, 8333, 8833,
			// M4 swings sixteenths (<swing-type>16th</swing-type>, 2:1): the pair spans 500ms, so
			// the off-beat sixteenths land 333ms in rather than 250.
			9333,
			9667, 9833, 10167,
			// The half rest after them starts where the fourth sixteenth ends.
			10333,
		]);
		// Straight, the pickup would be 500ms. Swung it is 333ms, and the four full bars stay
		// 3000ms each: swing moves notes within a bar, never the barlines.
		expect(result.durationMs).toBe(12333);
	});
});
