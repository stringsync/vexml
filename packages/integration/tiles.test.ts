import { describe, expect, it } from 'bun:test';
import type { ConfigInput } from '@stringsync/vexml';
import { testing } from './setup';

// tiles_wide.musicxml is four grand-staff measures; a gap 75000px wide before the last stretches
// its one panoramic system to about 75800 x 310px: past Chrome's 65535px cap on a canvas side (one
// canvas that wide paints nothing) and about 23M px, past the tile budget, so only the tiles near
// the view are painted. Each eval scrolls an 800px box to the score's end and reads what the tiles
// there hold.
const WIDE: ConfigInput = {
	layout: { type: 'panoramic' },
	width: 800,
	gaps: [{ beforeMeasureIndex: 3, durationMs: 1000, minWidth: 75000 }],
};

describe('tiles', () => {
	it.concurrent('paints a score wider than one canvas can be, out to its last measure once scrolled there', async () => {
		const { result } = await testing.eval(
			'tiles_wide.musicxml',
			WIDE,
			async ({ container }) => {
				const frame = () => new Promise((r) => requestAnimationFrame(r));
				const base = container.querySelector('.vexml-canvas') as HTMLElement;
				const width = parseFloat(base.style.getPropertyValue('--vexml-width'));
				const tiles = () => Array.from(base.querySelectorAll('canvas'));
				// Whether the tile over score x (if one is painted) holds any ink.
				const inkAt = (x: number) => {
					const tile = tiles().find((c) => {
						const left = parseFloat(c.style.left);
						return x >= left && x < left + parseFloat(c.style.width);
					});
					const data = tile
						?.getContext('2d')
						?.getImageData(0, 0, tile.width, tile.height).data;
					return data?.some((v, i) => i % 4 === 3 && v > 0) ?? false;
				};
				const before = { painted: tiles().length, end: inkAt(width - 50) };
				container.scrollLeft = container.scrollWidth;
				await frame();
				await frame();
				return {
					width,
					before,
					end: inkAt(width - 50),
					largest: Math.max(...tiles().map((c) => Math.max(c.width, c.height))),
				};
			},
		);

		expect(result.width).toBeGreaterThan(65535);
		expect(result.before.painted).toBeLessThan(10);
		expect(result.before.end).toBe(false);
		expect(result.end).toBe(true);
		expect(result.largest).toBeLessThanOrEqual(2048);
	});

	it.concurrent('keeps a content layer at full resolution over a long score', async () => {
		const { result } = await testing.eval(
			'tiles_wide.musicxml',
			WIDE,
			async ({ score, container }) => {
				const frame = () => new Promise((r) => requestAnimationFrame(r));
				const base = container.querySelector('.vexml-canvas') as HTMLElement;
				const width = parseFloat(base.style.getPropertyValue('--vexml-width'));
				const layer = score.addLayer('content');
				layer.ctx.fillStyle = 'rgb(255, 0, 0)';
				layer.ctx.fillRect(width - 60, 20, 20, 20);
				container.scrollLeft = container.scrollWidth;
				await frame();
				await frame();
				const element = container.querySelector('div.vexml-layer');
				const tile = Array.from(element?.querySelectorAll('canvas') ?? []).find(
					(c) =>
						parseFloat(c.style.left) + parseFloat(c.style.width) >= width - 40,
				) as HTMLCanvasElement;
				const ctx = tile.getContext('2d') as CanvasRenderingContext2D;
				// The tile's device px per CSS px: the screen's, not a fraction capped by the score's size.
				const dpr = window.devicePixelRatio;
				const x = (width - 50 - parseFloat(tile.style.left)) * dpr;
				return {
					dpr,
					scale: tile.width / parseFloat(tile.style.width),
					pixel: [...ctx.getImageData(Math.floor(x), 30 * dpr, 1, 1).data].join(
						',',
					),
				};
			},
		);

		expect(result.scale).toBeCloseTo(result.dpr, 2);
		expect(result.pixel).toBe('255,0,0,255');
	});
});
