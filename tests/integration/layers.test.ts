import { expect, test } from 'bun:test';
import { TEST_URL, testBrowser } from '../testing/setup';

// Custom layers, end to end in a real browser: a content layer spans the engraved score (score
// space), a viewport layer spans the visible box (client space) and is re-fit when the container
// resizes. Reads layer.ctx.canvas to check sizing — a test-only peek; the public Layer hides the
// canvas. Uses the run's shared browser/server (see setup.ts).
test('content layers span the score, viewport layers span the visible box and re-fit on resize', async () => {
	const browser = await testBrowser();
	const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
	try {
		await page.goto(TEST_URL);
		const result = await page.evaluate(async () => {
			const container = document.getElementById('screenshot');
			if (!(container instanceof HTMLDivElement)) {
				throw new Error('container not found');
			}
			const xml = await (
				await fetch('/data/structure_single_stave.musicxml')
			).text();
			const score = await window.render(xml, container, {});
			const base = container.querySelector('canvas');
			if (!base) {
				throw new Error('base canvas not found');
			}

			const content = score.addLayer('content');
			const viewport = score.addLayer('viewport');
			const before = {
				contentW: parseFloat(content.ctx.canvas.style.width),
				baseW: parseFloat(base.style.width),
				viewportW: parseFloat(viewport.ctx.canvas.style.width),
				clientW: container.clientWidth,
			};

			// Shrink the container and wait for the resize to propagate to the viewport layer.
			let resizes = 0;
			const settled = new Promise<void>((resolve) => {
				score.addEventListener('resize', () => {
					resizes++;
					if (
						parseFloat(viewport.ctx.canvas.style.width) ===
							container.clientWidth &&
						container.clientWidth < before.clientW
					) {
						resolve();
					}
				});
			});
			container.style.width = '300px';
			await Promise.race([
				settled,
				new Promise<void>((r) => setTimeout(r, 3000)),
			]);

			return {
				before,
				after: {
					viewportW: parseFloat(viewport.ctx.canvas.style.width),
					clientW: container.clientWidth,
					resizes,
				},
			};
		});

		// Content layer matches the base canvas (score space); viewport matches the visible box.
		expect(result.before.contentW).toBeCloseTo(result.before.baseW, 0);
		expect(result.before.viewportW).toBeCloseTo(result.before.clientW, 0);
		// Shrinking the container fired a resize that re-fit the viewport layer to the new box.
		expect(result.after.clientW).toBeLessThan(result.before.clientW);
		expect(result.after.resizes).toBeGreaterThan(0);
		expect(result.after.viewportW).toBeCloseTo(result.after.clientW, 0);
	} finally {
		await page.close();
	}
}, 30_000);
