import { expect, test } from 'bun:test';
import { TEST_URL, testBrowser } from '../testing/setup';

// The unit tests cover the wiring with fakes; this proves the real chain end to end — a DOM
// pointer event on the managed canvas bubbles to the Score, gets mapped to score space through
// the live Stage transform, and hit-tests against the index built from real geometry. Uses the
// run's shared browser/server (see setup.ts).
test('a real pointer event maps to score space and hit-tests a target', async () => {
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
			const canvas = container.querySelector('canvas');
			if (!canvas) {
				throw new Error('canvas not found');
			}

			const types = new Set<string>();
			const points: Array<{ x: number; y: number }> = [];
			score.addEventListener('pointerdown', (e) => {
				if (e.target) {
					types.add(e.target.type);
				}
				points.push({ x: e.point.x, y: e.point.y });
			});

			// Scan down the vertical center line so the stave is crossed wherever the crop
			// places it — robust to the exact engraved height.
			const rect = canvas.getBoundingClientRect();
			const cx = rect.left + rect.width / 2;
			for (let dy = 4; dy < rect.height; dy += 4) {
				canvas.dispatchEvent(
					new PointerEvent('pointerdown', {
						clientX: cx,
						clientY: rect.top + dy,
						bubbles: true,
					}),
				);
			}
			return { types: [...types], points, width: rect.width };
		});

		// The event reached the listener with its point mapped into score space (the unscaled
		// harness canvas means client x == score x, offset by the canvas origin).
		expect(result.points.length).toBeGreaterThan(0);
		expect(result.points[0]?.x).toBeCloseTo(result.width / 2, 0);
		expect(result.points[0]?.y).toBeCloseTo(4, 0);
		// The measure box, built from real geometry, was hittable.
		expect(result.types).toContain('measure');
	} finally {
		await page.close();
	}
}, 30_000);
