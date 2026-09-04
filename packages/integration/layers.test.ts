import { describe, expect, it } from 'bun:test';
import { testing } from './setup';

describe('layers', () => {
	// Custom layers, end to end in a real browser: a content layer spans the engraved score (score
	// space), a viewport layer spans the visible box (client space) and is re-fit when the container
	// resizes. The fn reads layer.ctx.canvas to check sizing: a test-only peek, since the public
	// Layer hides the canvas.
	it.concurrent('content layers span the score, viewport layers span the visible box and re-fit on resize', async () => {
		const { result } = await testing.eval(
			'structure_single_stave.musicxml',
			{},
			async ({ score, container }) => {
				const base = container.querySelector('canvas');
				if (!base) {
					throw new Error('base canvas not found');
				}
				const content = score.addLayer('content');
				const viewport = score.addLayer('viewport');
				const before = {
					contentW: parseFloat(content.ctx.canvas.style.width),
					baseW: parseFloat(base.style.getPropertyValue('--vexml-width')),
					viewportW: parseFloat(viewport.ctx.canvas.style.width),
					clientW: container.clientWidth,
				};

				// Any 'resize' settles the wait: Score re-fits its viewport layers before it
				// dispatches, and it dispatches only when the container box actually changed, so the
				// first one already reports the shrunken box.
				let resized = () => {};
				const settled = new Promise<void>((resolve) => {
					resized = resolve;
				});
				let resizes = 0;
				const unlisten = score.events.on('resize', () => {
					resizes++;
					resized();
				});

				// A deadline rather than a hang, so a resize that never arrives fails on the
				// assertions below instead of on the suite's timeout.
				let expire = () => {};
				const deadline = new Promise<void>((resolve) => {
					expire = resolve;
				});
				const timer = setTimeout(expire, 3000);

				container.style.width = '300px';
				try {
					await Promise.race([settled, deadline]);
				} finally {
					clearTimeout(timer);
					unlisten();
				}

				return {
					before,
					after: {
						viewportW: parseFloat(viewport.ctx.canvas.style.width),
						clientW: container.clientWidth,
						resizes,
					},
				};
			},
		);

		expect(result.before.contentW).toBeCloseTo(result.before.baseW, 0);
		expect(result.before.viewportW).toBeCloseTo(result.before.clientW, 0);
		expect(result.after.clientW).toBeLessThan(result.before.clientW);
		expect(result.after.resizes).toBeGreaterThan(0);
		expect(result.after.viewportW).toBeCloseTo(result.after.clientW, 0);
	});
});
