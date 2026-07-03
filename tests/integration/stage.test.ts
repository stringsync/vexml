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

	// The managed canvas sizes itself to the score's intrinsic width by default, but a caller can
	// scale it to their container with an ordinary `.vexml-canvas { width: 100% }` rule — no
	// `!important`, because vexml's own default rule is wrapped in :where() (zero specificity).
	it.concurrent('caller CSS scales the canvas to its container without !important', async () => {
		const { result } = await renderTest(
			'structure_single_stave.musicxml',
			{},
			async (_score, container) => {
				const canvas = container.querySelector(
					'.vexml-canvas',
				) as HTMLCanvasElement;
				const intrinsic = parseFloat(
					canvas.style.getPropertyValue('--vexml-width'),
				);
				// Default: the :where() rule renders the canvas at its intrinsic width (scale 1).
				const defaultWidth = canvas.getBoundingClientRect().width;

				// Constrain the container narrower than the score and add a plain (no !important) rule
				// telling the canvas to fill it.
				container.style.width = '300px';
				const style = document.createElement('style');
				style.textContent = '.vexml-canvas { width: 100%; height: auto }';
				document.head.appendChild(style);
				// Force layout, then measure. Compare against the container's content-box width
				// (getComputedStyle.width), since the canvas's width:100% resolves against that, not the
				// padded clientWidth.
				const scaledWidth = canvas.getBoundingClientRect().width;
				const contentWidth = parseFloat(getComputedStyle(container).width);
				style.remove();

				return { intrinsic, defaultWidth, scaledWidth, contentWidth };
			},
		);

		// The default rule sizes the canvas to the intrinsic score width...
		expect(result.defaultWidth).toBeCloseTo(result.intrinsic, 0);
		// ...and the plain caller rule overrode it: the canvas shrank to fill the 300px container,
		// below its intrinsic width — proving the override worked without !important.
		expect(result.scaledWidth).toBeCloseTo(result.contentWidth, 0);
		expect(result.scaledWidth).toBeLessThan(result.intrinsic);
	});

	// The library scales the score to fit its container for free (no caller CSS): a standard layout
	// shrinks to a narrow container preserving aspect, never grows past its engraved width, and is
	// centered. This is the default; a caller who capped the width into a scroll box opts out.
	it.concurrent('fits and centers the score in its container by default', async () => {
		const { result } = await renderTest(
			'structure_single_stave.musicxml',
			{},
			async (_score, container) => {
				const canvas = container.querySelector(
					'.vexml-canvas',
				) as HTMLCanvasElement;
				const intrinsicW = parseFloat(
					canvas.style.getPropertyValue('--vexml-width'),
				);
				const intrinsicH = parseFloat(
					canvas.style.getPropertyValue('--vexml-height'),
				);

				// Narrower than the score: it shrinks to fill, keeping its aspect ratio.
				container.style.width = `${Math.round(intrinsicW / 2)}px`;
				const narrow = canvas.getBoundingClientRect();
				const narrowContent = parseFloat(getComputedStyle(container).width);

				// Wider than the score: it stays at its engraved width (no upscaling) and centers —
				// equal gaps to the container's content edges.
				container.style.width = `${Math.round(intrinsicW * 2)}px`;
				const padLeft = parseFloat(getComputedStyle(container).paddingLeft);
				const padRight = parseFloat(getComputedStyle(container).paddingRight);
				const wide = canvas.getBoundingClientRect();
				const box = container.getBoundingClientRect();
				const gapLeft = wide.left - (box.left + padLeft);
				const gapRight = box.right - padRight - wide.right;

				return {
					intrinsicW,
					aspect: intrinsicW / intrinsicH,
					narrowW: narrow.width,
					narrowAspect: narrow.width / narrow.height,
					narrowContent,
					wideW: wide.width,
					gapLeft,
					gapRight,
				};
			},
		);

		// Shrank to fill the narrow container, below intrinsic, aspect preserved.
		expect(result.narrowW).toBeCloseTo(result.narrowContent, 0);
		expect(result.narrowW).toBeLessThan(result.intrinsicW);
		expect(result.narrowAspect).toBeCloseTo(result.aspect, 1);
		// Held at intrinsic width in the wide container (never upscaled) and centered.
		expect(result.wideW).toBeCloseTo(result.intrinsicW, 0);
		expect(result.gapLeft).toBeGreaterThan(0);
		expect(result.gapLeft).toBeCloseTo(result.gapRight, 0);
	});
});
