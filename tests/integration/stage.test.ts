import { describe, expect, it } from 'bun:test';
import { TEST_URL, testBrowser } from '../testing/setup';

describe('stage', () => {
	// Re-rendering into the same container must not lose the scroll-box styling. The keep-old-until-
	// new-ready pattern mounts a second Stage before disposing the first; disposing the first must not
	// stomp the second's position/overflow (the LIFO restore bug). Drives two real render() calls and
	// reads computed styles. Uses the run's shared browser/server (see setup.ts).
	it('keeps scroll-box styles when re-rendering into a live container', async () => {
		const browser = await testBrowser();
		const page = await browser.newPage({
			viewport: { width: 900, height: 700 },
		});
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
				// A height cap makes the container a scroll box.
				const config = { height: 200 };
				const first = await window.render(xml, container, config);
				const before = {
					overflowY: getComputedStyle(container).overflowY,
					position: getComputedStyle(container).position,
				};
				// Mount the second Stage while the first is still bound, then dispose the first.
				await window.render(xml, container, config);
				first.dispose();
				const after = {
					overflowY: getComputedStyle(container).overflowY,
					position: getComputedStyle(container).position,
					scrollHeight: container.scrollHeight,
					clientHeight: container.clientHeight,
				};
				return { before, after };
			});

			expect(result.before.overflowY).toBe('auto');
			expect(result.before.position).toBe('relative');
			// Disposing the first Stage left the second's scroll-box styling intact.
			expect(result.after.overflowY).toBe('auto');
			expect(result.after.position).toBe('relative');
			expect(result.after.scrollHeight).toBeGreaterThan(
				result.after.clientHeight,
			);
		} finally {
			await page.close();
		}
	}, 30_000);
});
