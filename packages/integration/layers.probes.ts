import type { Score } from '@stringsync/vexml';

/** Add a content and a viewport layer, then shrink the container and wait for the
 * resize to re-fit the viewport layer. Reads layer.ctx.canvas to check sizing — a
 * test-only peek; the public Layer hides the canvas. */
export async function layerSizing(score: Score, container: HTMLDivElement) {
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

	// Shrink the container and wait for the resize to propagate to the viewport layer.
	let resizes = 0;
	const settled = new Promise<void>((resolve) => {
		score.events.on('resize', () => {
			resizes++;
			if (
				parseFloat(viewport.ctx.canvas.style.width) === container.clientWidth &&
				container.clientWidth < before.clientW
			) {
				resolve();
			}
		});
	});
	container.style.width = '300px';
	await Promise.race([settled, new Promise<void>((r) => setTimeout(r, 3000))]);

	return {
		before,
		after: {
			viewportW: parseFloat(viewport.ctx.canvas.style.width),
			clientW: container.clientWidth,
			resizes,
		},
	};
}
