import { describe, expect, it } from 'bun:test';
import type { ConfigInput } from '@stringsync/vexml';
import type { VexmlContext } from '@vexml/renderer';
import { testing } from './setup';

// A caller renders into a box inside a scroller they own and names it as scrollContainer. These
// size the scroller against the score (just right, too big, too small, and the mixed width/height
// combos) and check what the cursor measures and scrolls, and that the layers riding on the score
// (halos, hover hit-testing) stay on their notes after the outer scroller moves.
//
// A standard layout scales the score down to fit its box by default, so a narrow scroller shrinks
// the engraving instead of scrolling sideways. A panoramic layout opts out of that and is how these
// get horizontal overflow.

const FIXTURE = 'score_mozart_an_chloe.musicxml';
const STANDARD: ConfigInput = {};
const PANORAMIC: ConfigInput = { layout: { type: 'panoramic' } };
// SCROLL_TOP_PADDING_PX / SCROLL_SIDE_PADDING_PX: where scrollIntoView parks a bar it brought in.
const PADDING = 16;

type Case = {
	xml: string;
	config: ConfigInput;
	// Scroller content-box size as a multiple of the score's engraved size.
	w: number;
	h: number;
	// Where to seek, as a fraction of the score's duration. Mid-score by default: at the very end the
	// scroller is clamped at its max scroll and can't park the bar at its padding.
	at: number;
	// Add a viewport layer and report its box.
	viewportLayer?: boolean;
};

type Probe = Awaited<ReturnType<typeof probe>>;

describe('scrollContainer', () => {
	describe('standard layout (scaled to fit)', () => {
		it.concurrent('just right: nothing scrolls and the bar is always visible', async () => {
			const r = await run(STANDARD, 1, 1);
			// The box is exactly as tall as the engraving (no inline line gap), so nothing overflows.
			expect(r.boxGap).toBeCloseTo(0, 0);
			expect(r.overflow).toEqual({ x: false, y: false });
			expect(r.scale).toBeCloseTo(1);
			expect(r.visibleAtStart).toBe(true);
			expect(r.visibleAtSeek).toBe(true);
			expect(r.after.scroll).toEqual({ left: 0, top: 0 });
			expect(r.events).toEqual([]);
			expectLayersAligned(r);
		});

		it.concurrent('too big: nothing scrolls, the score stays centered at full size', async () => {
			const r = await run(STANDARD, 1.3, 1.3);
			expect(r.overflow).toEqual({ x: false, y: false });
			expect(r.scale).toBeCloseTo(1);
			// Centered in the extra width: an equal margin either side.
			expect(r.canvasInset.left).toBeCloseTo(r.canvasInset.right, 0);
			expect(r.canvasInset.left).toBeGreaterThan(0);
			expect(r.visibleAtSeek).toBe(true);
			expect(r.after.scroll).toEqual({ left: 0, top: 0 });
			expect(r.events).toEqual([]);
			expectLayersAligned(r);
		});

		// Pre-existing: visibility compares the bar to the scroller's box only, not the browser
		// window. A scroller taller than the window calls a bar below the window's fold visible.
		it.concurrent('too big: a bar below the window fold still reads as visible', async () => {
			const r = await run(STANDARD, 1.3, 1.3, { at: 0.999 });
			expect(r.windowHeight).toBeLessThan(r.after.bar.bottom);
			expect(r.visibleAtSeek).toBe(true);
		});

		it.concurrent('too short: scrolls vertically only', async () => {
			const r = await run(STANDARD, 1, 0.3);
			expect(r.overflow).toEqual({ x: false, y: true });
			expect(r.visibleAtStart).toBe(true);
			expect(r.visibleAtSeek).toBe(false);
			expect(r.after.scroll.left).toBe(0);
			expect(r.after.scroll.top).toBeGreaterThan(0);
			expect(r.after.visible).toBe(true);
			expect(r.after.bar.fromTop).toBeCloseTo(PADDING, 0);
			expect(r.events).toEqual([false, true]);
			expect(r.lastScrollEvent).toEqual(r.after.scroll);
			expectLayersAligned(r);
		});

		it.concurrent('too narrow: the score shrinks to fit and nothing scrolls', async () => {
			const r = await run(STANDARD, 0.6, 1);
			expect(r.scale).toBeCloseTo(0.6, 2);
			// Shrunk proportionally, so a height sized for the full score has room to spare.
			expect(r.overflow).toEqual({ x: false, y: false });
			expect(r.visibleAtSeek).toBe(true);
			expect(r.after.scroll).toEqual({ left: 0, top: 0 });
			expect(r.events).toEqual([]);
			expectLayersAligned(r);
		});

		it.concurrent('too narrow and too short: shrinks, then scrolls vertically', async () => {
			// Shorter than the other cases: the shrunk score is only ~1800px, so a 0.3 scroller would
			// either show the midpoint already or clamp at its max scroll before the padding.
			const r = await run(STANDARD, 0.6, 0.15);
			expect(r.scale).toBeCloseTo(0.6, 2);
			expect(r.overflow).toEqual({ x: false, y: true });
			expect(r.visibleAtSeek).toBe(false);
			expect(r.after.scroll.left).toBe(0);
			expect(r.after.visible).toBe(true);
			expect(r.after.bar.fromTop).toBeCloseTo(PADDING, 0);
			expect(r.events).toEqual([false, true]);
			expectLayersAligned(r);
		});

		it.concurrent('too wide but too short: scrolls vertically over a centered score', async () => {
			const r = await run(STANDARD, 1.3, 0.3);
			expect(r.scale).toBeCloseTo(1);
			expect(r.overflow).toEqual({ x: false, y: true });
			expect(r.canvasInset.left).toBeCloseTo(r.canvasInset.right, 0);
			expect(r.visibleAtSeek).toBe(false);
			expect(r.after.scroll.left).toBe(0);
			expect(r.after.visible).toBe(true);
			expect(r.after.bar.fromTop).toBeCloseTo(PADDING, 0);
			expectLayersAligned(r);
		});

		it.concurrent('too narrow but too tall: shrinks and nothing scrolls', async () => {
			const r = await run(STANDARD, 0.6, 1.3);
			expect(r.scale).toBeCloseTo(0.6, 2);
			expect(r.overflow).toEqual({ x: false, y: false });
			expect(r.visibleAtSeek).toBe(true);
			expect(r.after.scroll).toEqual({ left: 0, top: 0 });
			expectLayersAligned(r);
		});

		// A system taller than the scroller can never fit: scrollIntoView shows its top, holds
		// there on a repeat call, and visibility never reports true.
		it.concurrent('shorter than one system: shows the system top and holds', async () => {
			const r = await run(STANDARD, 1, 0.08);
			expect(r.overflow).toEqual({ x: false, y: true });
			expect(r.after.bar.height).toBeGreaterThan(r.clientSize.height);
			expect(r.after.visible).toBe(false);
			expect(r.after.bar.fromTop).toBeCloseTo(PADDING, 0);
			expect(r.again).toEqual(r.after.scroll);
			expect(r.events).not.toContain(true);
		});
	});

	describe('panoramic layout (no fit)', () => {
		it.concurrent('too narrow: scrolls horizontally only', async () => {
			const r = await run(PANORAMIC, 0.3, 1);
			expect(r.scale).toBeCloseTo(1);
			expect(r.overflow).toEqual({ x: true, y: false });
			expect(r.visibleAtSeek).toBe(false);
			expect(r.after.scroll.top).toBe(0);
			expect(r.after.scroll.left).toBeGreaterThan(0);
			expect(r.after.visible).toBe(true);
			expect(r.after.bar.fromLeft).toBeCloseTo(PADDING, 0);
			expect(r.events).toEqual([false, true]);
			expect(r.lastScrollEvent).toEqual(r.after.scroll);
			expectLayersAligned(r);
		});

		it.concurrent('too narrow but too tall: scrolls horizontally only', async () => {
			const r = await run(PANORAMIC, 0.3, 1.5);
			expect(r.overflow).toEqual({ x: true, y: false });
			expect(r.after.scroll.top).toBe(0);
			expect(r.after.scroll.left).toBeGreaterThan(0);
			expect(r.after.visible).toBe(true);
			expectLayersAligned(r);
		});

		// The system is taller than the scroller, so the bar can't fully fit: both axes move in the
		// one call, the vertical one to the system's top.
		it.concurrent('too narrow and too short: scrolls both axes at once', async () => {
			const r = await run(PANORAMIC, 0.3, 0.6);
			expect(r.overflow).toEqual({ x: true, y: true });
			expect(r.after.scroll.left).toBeGreaterThan(0);
			expect(r.after.scroll.top).toBeGreaterThan(0);
			expect(r.after.bar.fromLeft).toBeCloseTo(PADDING, 0);
			expect(r.after.bar.fromTop).toBeCloseTo(PADDING, 0);
			expectLayersAligned(r);
		});

		it.concurrent('too wide: nothing scrolls', async () => {
			const r = await run(PANORAMIC, 1.3, 1);
			expect(r.overflow).toEqual({ x: false, y: false });
			expect(r.visibleAtSeek).toBe(true);
			expect(r.after.scroll).toEqual({ left: 0, top: 0 });
			expectLayersAligned(r);
		});
	});

	describe('screenshots', () => {
		it.concurrent('a halo stays on its note after the scroller moves', async () => {
			const { image } = await shoot(STANDARD, 1, 0.3);
			expect(image).toMatchScreenshot('scroll_container_short_halo.png');
		});

		it.concurrent('a narrow scroller shrinks the score and its halo together', async () => {
			const { image } = await shoot(STANDARD, 0.6, 0.15);
			expect(image).toMatchScreenshot('scroll_container_narrow_halo.png');
		});

		it.concurrent('a panoramic score scrolls sideways under its halo', async () => {
			const { image } = await shoot(PANORAMIC, 0.3, 1.2);
			expect(image).toMatchScreenshot('scroll_container_panoramic_halo.png');
		});
	});

	// A viewport layer covers the scroller's visible box, not the (much taller) render box, and
	// stays over it after the scroller moves.
	it.concurrent('a viewport layer spans the scroller’s visible box after scrolling', async () => {
		const r = await run(STANDARD, 1, 0.3, { viewportLayer: true });
		expect(r.after.scroll.top).toBeGreaterThan(0);
		expect(r.viewportLayer).toEqual({ ...r.clientSize, left: 0, top: 0 });
	});
});

async function run(
	config: ConfigInput,
	w: number,
	h: number,
	extra: Partial<Case> = {},
): Promise<Probe> {
	return (await shoot(config, w, h, extra)).result;
}

async function shoot(
	config: ConfigInput,
	w: number,
	h: number,
	extra: Partial<Case> = {},
) {
	const xml = await testing.fixture(FIXTURE);
	return testing.eval(FIXTURE, config, probe, {
		xml,
		config,
		w,
		h,
		at: 0.5,
		...extra,
	} satisfies Case);
}

// The halo sits on the note under the bar, and pointing at that note hovers it.
function expectLayersAligned(r: Probe): void {
	expect(r.halo.onNote).toBeGreaterThan(0);
	expect(r.halo.offNote).toBe(0);
	expect(r.hoveredNote).toBe(true);
}

// Runs in the page, so it's self-contained: eval serializes it, and nothing outside it exists there.
async function probe({ score, container, render }: VexmlContext, c: Case) {
	const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
	const BORDER = 4;

	// The fixture's own render (same config) gives the engraved size to scale the scroller from.
	const first = container.querySelector('.vexml-canvas') as HTMLCanvasElement;
	const intrinsic = {
		width: parseFloat(first.style.getPropertyValue('--vexml-width')),
		height: parseFloat(first.style.getPropertyValue('--vexml-height')),
	};
	score.dispose();
	container.replaceChildren();

	const scroller = document.createElement('div');
	scroller.style.cssText = `width:${Math.round(intrinsic.width * c.w)}px;height:${Math.round(
		intrinsic.height * c.h,
	)}px;overflow:auto;border:${BORDER}px solid #888`;
	const box = document.createElement('div');
	scroller.appendChild(box);
	container.appendChild(scroller);
	const s = await render(c.xml, box, {
		...c.config,
		scrollContainer: scroller,
	});
	await frame();

	const canvas = box.querySelector('.vexml-canvas') as HTMLCanvasElement;
	const cursor = s.createCursor();
	const visibleAtStart = cursor.isFullyVisible();
	const events: boolean[] = [];
	cursor.events.on('visibility', (e) => events.push(e.fullyVisible));
	let lastScrollEvent: { left: number; top: number } | null = null;
	s.events.on('scroll', (e) => {
		lastScrollEvent = { left: e.left, top: e.top };
	});

	cursor.seekMs(s.getDurationMs() * c.at);
	const visibleAtSeek = cursor.isFullyVisible();
	const note = cursor.getActiveElements()[0];
	if (!note) {
		throw new Error('no note under the cursor');
	}
	note.halo.on('rgba(41, 98, 255, 0.6)');
	const viewport = c.viewportLayer ? s.addLayer('viewport') : null;

	cursor.scrollIntoView({ behavior: 'instant' });
	await frame();

	// The bar's client box, from its score rect and the canvas's live rendered box.
	const scoreRect = s.getSequence().positionAt(cursor.getTimeMs());
	if (!scoreRect) {
		throw new Error('no bar at the cursor');
	}
	const cr = canvas.getBoundingClientRect();
	const scale = cr.width / intrinsic.width;
	const sr = scroller.getBoundingClientRect();
	const bar = {
		left: cr.left + scoreRect.x * scale,
		top: cr.top + scoreRect.y * scale,
		height: scoreRect.h * scale,
		bottom: cr.top + (scoreRect.y + scoreRect.h) * scale,
	};
	const after = {
		scroll: { left: scroller.scrollLeft, top: scroller.scrollTop },
		visible: cursor.isFullyVisible(),
		bar: {
			...bar,
			// From the scroller's padding edge, inside its border.
			fromLeft: bar.left - sr.left - scroller.clientLeft,
			fromTop: bar.top - sr.top - scroller.clientTop,
		},
	};
	cursor.scrollIntoView({ behavior: 'instant' });
	const again = { left: scroller.scrollLeft, top: scroller.scrollTop };

	// Read the halo layer's pixels at the note's center and at a point well clear of it.
	const layer = box.querySelector('.vexml-layer') as HTMLCanvasElement;
	const lr = layer.getBoundingClientRect();
	const alphaAt = (x: number, y: number) => {
		const px = Math.floor((x - lr.left) * (layer.width / lr.width));
		const py = Math.floor((y - lr.top) * (layer.height / lr.height));
		const ctx = layer.getContext('2d') as CanvasRenderingContext2D;
		return ctx.getImageData(px, py, 1, 1).data[3] ?? 0;
	};
	const nr = note.getBoundingClientRect();
	const cx = nr.left + nr.width / 2;
	const cy = nr.top + nr.height / 2;
	const halo = { onNote: alphaAt(cx, cy), offNote: alphaAt(cx - 60, cy - 60) };

	// Hit-testing maps a client point through the scrolled canvas back onto the note.
	let hovered: unknown = null;
	s.events.on('hover', (e) => {
		hovered = e.target;
	});
	box.dispatchEvent(
		new PointerEvent('pointermove', {
			clientX: cx,
			clientY: cy,
			bubbles: true,
		}),
	);

	const viewportCanvas = viewport
		? (box.querySelectorAll('.vexml-layer')[1] as HTMLCanvasElement)
		: null;

	return {
		scale,
		overflow: {
			x: scroller.scrollWidth > scroller.clientWidth,
			y: scroller.scrollHeight > scroller.clientHeight,
		},
		clientSize: { width: scroller.clientWidth, height: scroller.clientHeight },
		canvasInset: {
			left: cr.left - sr.left - scroller.clientLeft,
			right: sr.left + scroller.clientLeft + scroller.clientWidth - cr.right,
		},
		windowHeight: window.innerHeight,
		// How much taller the box is than the engraving: the line box the inline canvas sits in.
		boxGap: box.getBoundingClientRect().height - cr.height,
		visibleAtStart,
		visibleAtSeek,
		after,
		again,
		events,
		lastScrollEvent: lastScrollEvent as { left: number; top: number } | null,
		halo,
		hoveredNote: hovered === note,
		viewportLayer: viewportCanvas
			? {
					width: viewportCanvas.clientWidth,
					height: viewportCanvas.clientHeight,
					// From the scroller's padding edge.
					left: Math.round(
						viewportCanvas.getBoundingClientRect().left -
							scroller.getBoundingClientRect().left -
							scroller.clientLeft,
					),
					top: Math.round(
						viewportCanvas.getBoundingClientRect().top -
							scroller.getBoundingClientRect().top -
							scroller.clientTop,
					),
				}
			: null,
	};
}
