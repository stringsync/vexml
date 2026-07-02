import { describe, expect, it } from 'bun:test';
import type { Note, TabPosition } from '@stringsync/vexml';
import { TEST_URL, testBrowser } from '../testing/setup';

// Decorations end to end, the way a caller actually reaches them: render, hover to hit-test the
// targets, toggle a decoration, and screenshot the composite (base engraving + the decoration
// overlay). The drawing logic itself is unit-tested in src/decorations.test.ts; this proves it
// lands on the score, aligned. Uses the run's shared browser/server (see setup.ts).
//
// Both noteheads (Note) and tab fret numbers (TabPosition) are decoratable, with their own
// drawColor stamps, so we collect both: a notation-only document yields only notes, a tab
// document lights up both the heads and the frets.

async function decorate(mode: 'color' | 'halo', file: string): Promise<Buffer> {
	const browser = await testBrowser();
	const page = await browser.newPage({ viewport: { width: 900, height: 400 } });
	try {
		await page.goto(TEST_URL);
		const count = await page.evaluate(
			async ({ mode, file }) => {
				const container = document.getElementById('screenshot');
				if (!(container instanceof HTMLDivElement)) {
					throw new Error('container not found');
				}
				const xml = await (await fetch(`/data/${file}`)).text();
				const score = await window.render(xml, container, {});
				const canvas = container.querySelector('canvas');
				if (!canvas) {
					throw new Error('canvas not found');
				}

				// Hover the whole canvas to collect every decoratable target under the pointer
				// (noteheads and tab frets), deduped by identity.
				const targets = new Set<Note | TabPosition>();
				score.addEventListener('pointermove', (e) => {
					if (e.target?.type === 'note' || e.target?.type === 'tab-position') {
						targets.add(e.target as Note | TabPosition);
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

				for (const target of targets) {
					if (mode === 'color') {
						target.color.on('#2962ff');
					} else {
						target.halo.on('rgba(41, 98, 255, 0.35)');
					}
				}
				return targets.size;
			},
			{ mode, file },
		);

		if (count === 0) {
			throw new Error('no targets found to decorate');
		}
		return await page.locator('#screenshot').screenshot();
	} finally {
		await page.close();
	}
}

describe('decorations', () => {
	it('a colored note', async () => {
		expect(await decorate('color', 'note.musicxml')).toMatchScreenshot(
			'decoration_color.png',
		);
	});

	it('a haloed note', async () => {
		expect(await decorate('halo', 'note.musicxml')).toMatchScreenshot(
			'decoration_halo.png',
		);
	});

	// A notation+tab document: the notation staff's noteheads and the tab staff's fret numbers both
	// light up. Color restamps each notehead glyph and each fret digit in blue; halo draws a soft
	// blue circle behind every notehead and every fret.
	it('colored notes and frets', async () => {
		expect(
			await decorate('color', 'structure_notation_and_tab_parts.musicxml'),
		).toMatchScreenshot('decoration_tab_color.png');
	});

	it('haloed notes and frets', async () => {
		expect(
			await decorate('halo', 'structure_notation_and_tab_parts.musicxml'),
		).toMatchScreenshot('decoration_tab_halo.png');
	});
});
