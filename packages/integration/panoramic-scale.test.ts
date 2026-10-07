import { describe, expect, it } from 'bun:test';
import type { VexmlContext } from '@vexml/renderer';
import { testing } from './setup';

// A panoramic line shown at a scale, or fitted into a strip of fitHeight CSS px: the engraving,
// the sticky fold, decorations, the playhead and every element rect must agree at that scale.

const WIDTH = 420;
const FIT = 126;

describe('panoramic scale', () => {
	it.concurrent('fits a notation+tab line into a strip, fold and overlays included', async () => {
		const { image } = await testing.eval(
			'score_amazing_grace.musicxml',
			{
				layout: { type: 'panoramic', stickySignatures: true, fitHeight: FIT },
				width: WIDTH,
			},
			decorateAndScroll,
		);
		expect(image).toMatchScreenshot('panoramic_fit_height.png');
	});

	it.concurrent('sizes everything to the fitted strip', async () => {
		const { result } = await testing.eval(
			'score_amazing_grace.musicxml',
			{
				layout: { type: 'panoramic', stickySignatures: true, fitHeight: FIT },
				width: WIDTH,
			},
			measure,
		);
		expect(result.canvasHeight).toBeCloseTo(FIT, 1);
		expect(result.foldHeight).toBeCloseTo(FIT, 1);
		expect(result.scale).toBeLessThan(1);
		// Element rects map through the shown scale, from the shown box's corner.
		expect(result.systemLeft).toBeCloseTo(
			result.canvasLeft + result.systemX * result.scale,
			1,
		);
		expect(result.systemHeight).toBeCloseTo(result.systemH * result.scale, 1);
		// Tiles are painted at the shown size, one bitmap px per device px.
		expect(result.tileDensity).toBeCloseTo(result.dpr, 1);
	});

	it.concurrent('shows the line at a fixed scale', async () => {
		const config = (scale: number) => ({
			layout: { type: 'panoramic' as const, scale },
			width: WIDTH,
		});
		const full = await testing.eval(
			'score_amazing_grace.musicxml',
			config(1),
			measure,
		);
		const half = await testing.eval(
			'score_amazing_grace.musicxml',
			config(0.5),
			measure,
		);
		expect(half.result.canvasHeight).toBeCloseTo(
			full.result.canvasHeight / 2,
			1,
		);
		expect(half.result.canvasWidth).toBeCloseTo(full.result.canvasWidth / 2, 1);
		expect(half.result.tileDensity).toBeCloseTo(half.result.dpr, 1);
	});
});

// Runs in the page, so it's self-contained: eval serializes it, and nothing outside it exists there.
async function decorateAndScroll({ score }: VexmlContext) {
	const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
	const notes = score.getElements().notes();
	for (const [i, note] of notes.entries()) {
		const target = note.getTabPosition() ?? note;
		if (i % 3 === 0) {
			target.color.on('#2962ff');
		} else if (i % 3 === 1) {
			target.halo.on('rgba(41, 98, 255, 0.35)');
		}
	}
	// The first layout is a resize, and scrolling holds off until resizes settle.
	await new Promise((resolve) => setTimeout(resolve, 300));
	const cursor = score.createCursor();
	cursor.sync(score.createPlayhead({ color: '#e53935', widthPx: 3 }));
	cursor.seekMs(score.getDurationMs() * 0.5);
	cursor.scrollIntoView({ behavior: 'instant' });
	await frame();
	await frame();
}

async function measure({ score, container }: VexmlContext) {
	const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
	await frame();
	const canvas = container.querySelector('.vexml-canvas') as HTMLElement;
	const box = canvas.getBoundingClientRect();
	const fold = container.querySelector('.vexml-fold canvas');
	const system = score.getSystems()[0];
	const client = system?.getBoundingClientRect();
	const tile = canvas.querySelector('.vexml-tiles canvas') as HTMLCanvasElement;
	return {
		canvasLeft: box.left,
		canvasWidth: box.width,
		canvasHeight: box.height,
		foldHeight: fold?.getBoundingClientRect().height ?? 0,
		scale:
			box.width / parseFloat(canvas.style.getPropertyValue('--vexml-width')),
		systemX: system?.rect.x ?? 0,
		systemH: system?.rect.h ?? 0,
		systemLeft: client?.left ?? 0,
		systemHeight: client?.height ?? 0,
		tileDensity: tile.width / tile.getBoundingClientRect().width,
		dpr: window.devicePixelRatio,
	};
}
