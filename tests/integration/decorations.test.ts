import { expect, test } from 'bun:test';
import type { Note } from '../../src';
import { TEST_URL, testBrowser } from '../testing/setup';

// Decorations end to end, the way a caller actually reaches them: render, hover to hit-test the
// notes, toggle a decoration, and screenshot the composite (base engraving + the decoration
// overlay). The drawing logic itself is unit-tested in src/decorations.test.ts; this proves it
// lands on the score, aligned. Uses the run's shared browser/server (see setup.ts).

async function decorate(mode: 'color' | 'halo'): Promise<Buffer> {
	const browser = await testBrowser();
	const page = await browser.newPage({ viewport: { width: 900, height: 400 } });
	try {
		await page.goto(TEST_URL);
		const count = await page.evaluate(async (mode) => {
			const container = document.getElementById('screenshot');
			if (!(container instanceof HTMLDivElement)) {
				throw new Error('container not found');
			}
			const xml = await (await fetch('/data/note.musicxml')).text();
			const score = await window.render(xml, container, {});
			const canvas = container.querySelector('canvas');
			if (!canvas) {
				throw new Error('canvas not found');
			}

			// Hover the whole canvas to collect every note under the pointer (deduped by identity).
			const notes = new Set<Note>();
			score.addEventListener('pointermove', (e) => {
				if (e.target?.type === 'note') {
					notes.add(e.target);
				}
			});
			const rect = canvas.getBoundingClientRect();
			for (let dy = 2; dy < rect.height; dy += 4) {
				for (let dx = 2; dx < rect.width; dx += 4) {
					canvas.dispatchEvent(
						new PointerEvent('pointermove', {
							clientX: rect.left + dx,
							clientY: rect.top + dy,
							bubbles: true,
						}),
					);
				}
			}

			for (const note of notes) {
				if (mode === 'color') {
					note.color.on('#2962ff');
				} else {
					note.halo.on('rgba(41, 98, 255, 0.35)');
				}
			}
			return notes.size;
		}, mode);

		if (count === 0) {
			throw new Error('no notes found to decorate');
		}
		return await page.locator('#screenshot').screenshot();
	} finally {
		await page.close();
	}
}

test('a colored note', async () => {
	expect(await decorate('color')).toMatchScreenshot('decoration_color.png');
}, 30_000);

test('a haloed note', async () => {
	expect(await decorate('halo')).toMatchScreenshot('decoration_halo.png');
}, 30_000);
