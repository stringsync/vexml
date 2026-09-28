import { describe, expect, it } from 'bun:test';
import { testing } from './setup';

describe('markers', () => {
	// Caller markers and the loupe, end to end in a real browser. The fn peeks at the DOM vexml
	// built (the marker's <div>, the loupe's <canvas>) to check what a caller only sees on screen.
	it.concurrent('stacks a rounded marker by z-index and magnifies it with the engraving in a loupe', async () => {
		const { result } = await testing.eval(
			'note.musicxml',
			{},
			async ({ score, container }) => {
				const note = score.getElements().notes()[0];
				if (!note) {
					throw new Error('no note to magnify');
				}
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
				const canvas =
					document.querySelector<HTMLCanvasElement>('.vexml-loupe');
				// It grows in rather than popping on.
				const entering = canvas?.getAnimations().length ?? 0;
				const ctx = canvas?.getContext('2d');
				if (!canvas || !ctx) {
					throw new Error('loupe canvas not found');
				}
				const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
				const center = ctx.getImageData(
					Math.floor(canvas.width / 2),
					Math.floor(canvas.height / 2),
					1,
					1,
				).data;
				let dark = 0;
				for (let i = 0; i < pixels.length; i += 4) {
					if (
						(pixels[i] ?? 255) < 80 &&
						(pixels[i + 1] ?? 255) < 80 &&
						(pixels[i + 2] ?? 255) < 80
					) {
						dark++;
					}
				}
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
});
