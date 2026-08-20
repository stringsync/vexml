import { describe, expect, it } from 'bun:test';
import { renderer } from './renderer';

describe('layers', () => {
	// Custom layers, end to end in a real browser: a content layer spans the engraved score (score
	// space), a viewport layer spans the visible box (client space) and is re-fit when the container
	// resizes. viewportLayerResize reads layer.ctx.canvas to check sizing — a test-only peek; the
	// public Layer hides the canvas.
	it.concurrent('content layers span the score, viewport layers span the visible box and re-fit on resize', async () => {
		const { result } = await renderer.render(
			'structure_single_stave.musicxml',
			{},
			{
				fn: (score, container) => window.viewportLayerResize(score, container),
			},
		);

		// Content layer matches the base canvas (score space); viewport matches the visible box.
		expect(result.before.contentW).toBeCloseTo(result.before.baseW, 0);
		expect(result.before.viewportW).toBeCloseTo(result.before.clientW, 0);
		// Shrinking the container fired a resize that re-fit the viewport layer to the new box.
		expect(result.after.clientW).toBeLessThan(result.before.clientW);
		expect(result.after.resizes).toBeGreaterThan(0);
		expect(result.after.viewportW).toBeCloseTo(result.after.clientW, 0);
	});
});
