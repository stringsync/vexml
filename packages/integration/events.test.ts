import { describe, expect, it } from 'bun:test';
import { renderer } from './renderer';

describe('events', () => {
	// The unit tests cover the wiring with fakes; this proves the real chain end to end — a DOM
	// pointer event on the managed canvas bubbles to the Score, gets mapped to score space through
	// the live Stage transform, and hit-tests against the index built from real geometry.
	it.concurrent('a real pointer event maps to score space and hit-tests a target', async () => {
		const { result } = await renderer.render(
			'structure_single_stave.musicxml',
			{},
			{ fn: (score, container) => window.sweepPointerDown(score, container) },
		);

		// The event reached the listener with its point mapped into score space (the unscaled
		// test canvas means client x == score x, offset by the canvas origin).
		expect(result.pointCount).toBeGreaterThan(0);
		expect(result.firstPoint.x).toBeCloseTo(result.width / 2, 0);
		expect(result.firstPoint.y).toBeCloseTo(4, 0);
		// The measure box, built from real geometry, was hittable.
		expect(result.types).toContain('measure');
	});
});
