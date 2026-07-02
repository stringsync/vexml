import { describe, expect, it } from 'bun:test';
import { renderTest } from '../testing/harness';

describe('stage', () => {
	// Re-rendering into the same container must not lose the scroll-box styling. The keep-old-until-
	// new-ready pattern mounts a second Stage before disposing the first; disposing the first must not
	// stomp the second's position/overflow (the LIFO restore bug). Drives two real render() calls and
	// reads computed styles. A height cap makes the container a scroll box.
	it.concurrent('keeps scroll-box styles when re-rendering into a live container', async () => {
		const { result } = await renderTest(
			'structure_single_stave.musicxml',
			{ height: 200 },
			async (first, container) => {
				const before = {
					overflowY: getComputedStyle(container).overflowY,
					position: getComputedStyle(container).position,
				};
				// Mount the second Stage while the first is still bound, then dispose the first.
				const xml = await (
					await fetch('/data/structure_single_stave.musicxml')
				).text();
				await window.render(xml, container, { height: 200 });
				first.dispose();
				const after = {
					overflowY: getComputedStyle(container).overflowY,
					position: getComputedStyle(container).position,
					scrollHeight: container.scrollHeight,
					clientHeight: container.clientHeight,
				};
				return { before, after };
			},
		);

		expect(result.before.overflowY).toBe('auto');
		expect(result.before.position).toBe('relative');
		// Disposing the first Stage left the second's scroll-box styling intact.
		expect(result.after.overflowY).toBe('auto');
		expect(result.after.position).toBe('relative');
		expect(result.after.scrollHeight).toBeGreaterThan(
			result.after.clientHeight,
		);
	});
});
