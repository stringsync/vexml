import { describe, expect, it } from 'bun:test';
import type { Note } from '@stringsync/vexml';
import { testing } from './setup';

describe('markers', () => {
	// Caller markers and the loupe, end to end in a real browser. The fn peeks at the DOM vexml
	// built (the marker's <div>, the loupe's <canvas>) to check what a caller only sees on screen.
	it.concurrent('stacks a rounded marker by z-index and magnifies it with the engraving in a loupe', async () => {
		const { result } = await testing.eval(
			'note.musicxml',
			{},
			async ({ score, container }) => {
				const note = score.getElements().notes()[0] as Note;
				const at = {
					x: note.rect.x + note.rect.w / 2,
					y: note.rect.y + note.rect.h / 2,
				};
				const tint = score.createMarker(-1);
				tint.show({ x: 0, y: 0, w: 50, h: 50 }, 'rgb(0 0 255 / 0.1)');
				const knob = score.createMarker(1);
				knob.show({ x: at.x - 2, y: at.y - 2, w: 4, h: 4 }, 'rgb(255, 0, 0)', {
					radius: 2,
				});
				const [tintEl, knobEl] = Array.from(
					container.querySelectorAll<HTMLElement>('.vexml-marker'),
				);

				const loupe = score.createLoupe({
					width: 40,
					height: 20,
					zoom: 2,
					radius: 8,
				});
				// Anchored to the knob, magnifying the notehead under it.
				loupe.show({ x: at.x - 2, y: at.y - 2, w: 4, h: 4 }, at);
				// It paints on the next frame, however many shows came before it.
				await new Promise(requestAnimationFrame);
				const canvas = document.querySelector(
					'.vexml-loupe',
				) as HTMLCanvasElement;
				// It grows in rather than popping on.
				const entering = canvas.getAnimations().length;
				const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
				const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
				const center = ctx.getImageData(
					Math.floor(canvas.width / 2),
					Math.floor(canvas.height / 2),
					1,
					1,
				).data;
				const dark = Array.from({ length: pixels.length / 4 }, (_, i) =>
					Array.from(pixels.slice(i * 4, i * 4 + 3)),
				).filter((rgb) => rgb.every((v) => v < 80)).length;
				const box = canvas.getBoundingClientRect();
				const anchor = knobEl?.getBoundingClientRect();
				const shown = {
					display: canvas.style.display,
					width: canvas.style.width,
					// Clear of the anchor it floats beside, and within the viewport.
					clear:
						!!anchor &&
						(box.bottom <= anchor.top ||
							box.left >= anchor.right ||
							box.right <= anchor.left),
					inside:
						box.left >= 0 &&
						box.top >= 0 &&
						box.right <= document.documentElement.clientWidth &&
						box.bottom <= document.documentElement.clientHeight,
				};
				// Reconfiguring a showing loupe resizes it in place, still showing.
				loupe.configure({ width: 60 });
				await new Promise(requestAnimationFrame);
				const configured = {
					display: canvas.style.display,
					width: canvas.style.width,
					bitmap: canvas.width,
				};
				loupe.hide();
				// ...and shrinks out before it goes.
				const leaving = canvas.style.display;
				await Promise.all(canvas.getAnimations().map((a) => a.finished));
				const hidden = canvas.style.display;
				score.dispose();
				return {
					tint: {
						zIndex: tintEl?.style.zIndex,
						radius: tintEl?.style.borderRadius,
					},
					knob: {
						zIndex: knobEl?.style.zIndex,
						radius: knobEl?.style.borderRadius,
					},
					center: [...center],
					dark,
					shown,
					configured,
					entering,
					leaving,
					dpr: window.devicePixelRatio,
					hidden,
					removed: !canvas.isConnected,
				};
			},
		);

		expect(result.tint).toEqual({ zIndex: '-1', radius: '' });
		expect(result.knob.zIndex).toBe('1');
		expect(result.knob.radius).not.toBe('');
		// The knob, in front of the notehead it covers, fills the loupe's center.
		expect(result.center).toEqual([255, 0, 0, 255]);
		// The engraving around it shows too.
		expect(result.dark).toBeGreaterThan(0);
		expect(result.shown).toEqual({
			display: '',
			width: '40px',
			clear: true,
			inside: true,
		});
		expect(result.configured).toEqual({
			display: '',
			width: '60px',
			bitmap: Math.round(60 * result.dpr),
		});
		expect(result.entering).toBeGreaterThan(0);
		expect(result.leaving).toBe('');
		expect(result.hidden).toBe('none');
		expect(result.removed).toBe(true);
	});

	// A page painting its own paper behind a transparent score, with the score shrunk to under half
	// size: each frame must replace the last, and the magnified bitmaps must line up with markers.
	it.concurrent('repaints cleanly over transparent paper and lines layers up with markers when shrunk', async () => {
		const { result } = await testing.eval(
			'note.musicxml',
			{ backgroundColor: 'transparent' },
			async ({ score, container }) => {
				const base = container.querySelector('.vexml-canvas') as HTMLElement;
				base.style.width = `${base.getBoundingClientRect().width * 0.44}px`;
				base.style.height = 'auto';
				const note = score.getElements().notes()[0] as Note;
				// A content layer's red block with a marker's blue block butted against its right edge.
				const at = { x: note.rect.x, y: note.rect.y + note.rect.h / 2 };
				const layer = score.addLayer('content');
				layer.ctx.fillStyle = 'rgb(255, 0, 0)';
				layer.ctx.fillRect(at.x - 20, at.y - 20, 20, 40);
				const block = score.createMarker(1);
				block.show({ x: at.x, y: at.y - 20, w: 20, h: 40 }, 'rgb(0, 0, 255)');
				// Off the score, where only markers paint: a translucent tint behind the engraving.
				const off = { x: -1000, y: -1000 };
				const tint = score.createMarker(-1);
				tint.show(
					{ x: off.x - 50, y: off.y - 50, w: 100, h: 100 },
					'rgb(0 255 0 / 0.4)',
				);

				const loupe = score.createLoupe({ width: 40, height: 20, zoom: 2 });
				const canvas = document.querySelector(
					'.vexml-loupe',
				) as HTMLCanvasElement;
				const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
				const pixel = (dx: number) =>
					[
						...ctx.getImageData(
							Math.floor(canvas.width / 2) + dx,
							Math.floor(canvas.height / 2),
							1,
							1,
						).data,
					].join(',');
				const paint = async (anchor: { x: number; y: number }) => {
					loupe.show({ ...anchor, w: 0, h: 0 }, anchor);
					await new Promise(requestAnimationFrame);
				};

				await paint(at);
				const dpr = window.devicePixelRatio;
				const edge = { left: pixel(-3 * dpr), right: pixel(2 * dpr) };
				const sx =
					base.getBoundingClientRect().width /
					parseFloat(base.style.getPropertyValue('--vexml-width'));
				tint.hide();
				await paint(off);
				// Nothing but paper once the blocks are out of view: white, as nothing behind is painted.
				const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
				const unpapered = pixels.filter((v) => v !== 255).length;
				tint.show(
					{ x: off.x - 50, y: off.y - 50, w: 100, h: 100 },
					'rgb(0 255 0 / 0.4)',
				);
				await paint(off);
				const tinted = pixel(0);
				loupe.configure({ paper: 'rgb(0, 0, 0)' });
				await new Promise(requestAnimationFrame);
				const papered = pixel(0);
				const topLayer = canvas.matches(':popover-open');
				score.dispose();
				return { edge, sx, unpapered, tinted, papered, topLayer };
			},
		);

		expect(result.sx).toBeLessThan(0.5);
		expect(result.edge).toEqual({ left: '255,0,0,255', right: '0,0,255,255' });
		expect(result.unpapered).toBe(0);
		expect(result.tinted).toBe('153,255,153,255');
		expect(result.papered).toBe('0,102,0,255');
		expect(result.topLayer).toBe(true);
	});
});
