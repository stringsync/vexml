import { afterAll, beforeAll, expect, it } from 'bun:test';
import { type Browser, chromium } from 'playwright';
import { InkMap } from '../vex/ink-map';
import { PlaywrightTab } from './playwright-tab';

let browser: Browser;
beforeAll(async () => {
	browser = await chromium.launch();
});
afterAll(() => browser.close());

it.each([
	{ width: 64, height: 150022, middle: 75020, end: 150000 },
	{ width: 932, height: 19480, middle: 9740, end: 19450 },
])('captures ink throughout a supported $width x $height SVG', async ({
	width,
	height,
	middle,
	end,
}) => {
	const page = await browser.newPage({ viewport: { width, height: 200 } });
	try {
		await page.setContent(`<body style="margin:0;background:white"><svg id="score" width="${width}" height="${height}" style="display:block">
<rect x="10" y="10" width="20" height="20"/>
<rect x="10" y="${middle - 10}" width="20" height="20"/>
<rect x="10" y="${end - 10}" width="20" height="20"/>
</svg></body>`);
		const ink = InkMap.fromPng(
			await new PlaywrightTab(page).screenshot('#score'),
		);
		expect(ink.width).toBe(width);
		expect(ink.height).toBe(height);
		expect([
			ink.isInk(20, 20),
			ink.isInk(20, middle),
			ink.isInk(20, end),
		]).toEqual([true, true, true]);
		expect(page.viewportSize()).toEqual({ width, height: 200 });
	} finally {
		await page.close();
	}
});

it.each([
	{ width: 932, height: 150022, scale: 1 },
	{ width: 4096, height: 4097, scale: 2 },
])('rejects oversized captures before growing the viewport ($scale x)', async ({
	width,
	height,
	scale,
}) => {
	const page = await browser.newPage({
		viewport: { width, height: 200 },
		deviceScaleFactor: scale,
	});
	try {
		await page.setContent(
			`<div id="score" style="width:${width}px;height:${height}px"></div>`,
		);
		await expect(new PlaywrightTab(page).screenshot('#score')).rejects.toThrow(
			'Unsupported capture size:',
		);
		expect(page.viewportSize()).toEqual({ width, height: 200 });
	} finally {
		await page.close();
	}
});

it('bounds the expanded viewport even when the capture itself is narrow', async () => {
	const page = await browser.newPage({ viewport: { width: 932, height: 200 } });
	try {
		await page.setContent(
			'<div id="score" style="width:32px;height:150022px"></div>',
		);
		await expect(new PlaywrightTab(page).screenshot('#score')).rejects.toThrow(
			'expanded viewport exceeds',
		);
		expect(page.viewportSize()).toEqual({ width: 932, height: 200 });
	} finally {
		await page.close();
	}
});

it('restores the viewport when the screenshot times out', async () => {
	const page = await browser.newPage({ viewport: { width: 64, height: 200 } });
	try {
		await page.setContent(`<style>
@keyframes move { from { transform:translateX(0) } to { transform:translateX(30px) } }
#score { width:20px; height:1000px; animation:move 1s linear infinite alternate }
</style><div id="score"></div>`);
		page.setDefaultTimeout(500);
		await expect(new PlaywrightTab(page).screenshot('#score')).rejects.toThrow(
			'Timeout',
		);
		expect(page.viewportSize()).toEqual({ width: 64, height: 200 });
	} finally {
		await page.close();
	}
});
