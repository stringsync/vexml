import { describe, expect, it } from 'bun:test';
import { InkMap } from '../vex/ink-map';
import { bundle } from './bundle';
import type { InkMask } from './ink-mask';
import type { MeasureBox } from './musescore-renderer';
import { tabPools } from './tab-pools';

describe('MuseScore SVG capture', () => {
	it.each([
		{ x: -40, y: -50, viewBox: '0 0 100 100' },
		{ x: -12, y: -12, viewBox: '0 0 100 100' },
		{ x: 120, y: 130, viewBox: '0 0 100 100' },
		{ x: 40, y: 50, viewBox: '20 30 100 100' },
	])('keeps ink and boxes aligned at $x, $y', async ({ x, y, viewBox }) => {
		const pool = tabPools.pool('musescore-capture-test', {
			html: '<body style="margin:0;background:white"><div id="screenshot" style="display:inline-block;overflow:hidden;vertical-align:top"></div></body>',
			scripts: async () => [
				await bundle(`${import.meta.dir}/musescore-page.ts`),
			],
			width: 400,
			height: 400,
		});
		await pool.withTab(async (tab) => {
			await tab.call('mount', {
				svg: `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="${viewBox}"><g transform="translate(${x} ${y})"><rect class="Clef" width="24" height="24"/></g></svg>`,
				boxes: [{ x, y, w: 24, h: 24 }],
			});
			const { masks, measures } = await tab.call<{
				masks: InkMask[];
				measures: MeasureBox[];
			}>('evaluate', { fnSrc: 'ctx => ctx' });
			const ink = InkMap.fromPng(await tab.screenshot('#screenshot'));
			const box = measures[0] ?? { x: NaN, y: NaN, w: NaN, h: NaN };
			expect(masks).toHaveLength(1);
			expect(
				masks[0]?.runs.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0),
			).toBeGreaterThan(950);
			expect(
				ink.rowInk(Math.floor(box.y + box.h / 2))?.count,
			).toBeGreaterThanOrEqual(32);
			expect(
				ink.isInk(Math.floor(box.x + box.w / 2), Math.floor(box.y + box.h / 2)),
			).toBe(true);
			expect(box.w).toBeCloseTo(32.5);
			expect(box.h).toBeCloseTo(32.5);
			expect(box.x).toBeGreaterThanOrEqual(10);
			expect(box.y).toBeGreaterThanOrEqual(10);
			expect(box.x + box.w).toBeLessThanOrEqual(ink.width - 10);
			expect(box.y + box.h).toBeLessThanOrEqual(ink.height - 10);
		});
	});
});
