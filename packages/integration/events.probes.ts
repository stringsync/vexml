import type { Score } from '@stringsync/vexml';

/** Dispatch real pointerdown events down the canvas's vertical center line and report
 * what the Score's event chain saw: target types, the first mapped point, the count. */
export function pointerScan(score: Score, container: HTMLDivElement) {
	const canvas = container.querySelector('canvas');
	if (!canvas) {
		throw new Error('canvas not found');
	}
	const types = new Set<string>();
	const points: Array<{ x: number; y: number }> = [];
	score.events.on('pointerdown', (e) => {
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
	return {
		types: [...types],
		firstPoint: points[0] ?? { x: -1, y: -1 },
		pointCount: points.length,
		width: rect.width,
	};
}
