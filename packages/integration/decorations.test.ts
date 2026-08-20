import { describe, expect, it } from 'bun:test';
import type { Note, Score, TabPosition } from '@stringsync/vexml';
import { renderer } from './renderer';

// Decorations end to end, the way a caller actually reaches them: render, hover to hit-test the
// targets, toggle a decoration, and screenshot the composite (base engraving + the decoration
// overlay). The drawing logic itself is unit-tested in packages/vexml/decorations.test.ts; this proves it
// lands on the score, aligned.
//
// Both noteheads (Note) and tab fret numbers (TabPosition) are decoratable, with their own
// drawColor stamps, so decorateAllTargets collects both: a notation-only document yields only
// notes, a tab document lights up both the heads and the frets.

describe('decorations', () => {
	it.concurrent('draws a colored note', async () => {
		const { result: count, png } = await renderer.render(
			'note.musicxml',
			{},
			{ fn: decorateAllTargets, arg: 'color' },
		);
		expect(count).toBeGreaterThan(0);
		expect(png).toMatchScreenshot('decoration_color.png');
	});

	it.concurrent('draws a halo behind a note', async () => {
		const { result: count, png } = await renderer.render(
			'note.musicxml',
			{},
			{ fn: decorateAllTargets, arg: 'halo' },
		);
		expect(count).toBeGreaterThan(0);
		expect(png).toMatchScreenshot('decoration_halo.png');
	});

	// A notation+tab document: the notation staff's noteheads and the tab staff's fret numbers both
	// light up. Color restamps each notehead glyph and each fret digit in blue; halo draws a soft
	// blue circle behind every notehead and every fret.
	it.concurrent('colors both a note and its tab fret', async () => {
		const { result: count, png } = await renderer.render(
			'structure_notation_and_tab_parts.musicxml',
			{},
			{ fn: decorateAllTargets, arg: 'color' },
		);
		expect(count).toBeGreaterThan(0);
		expect(png).toMatchScreenshot('decoration_tab_color.png');
	});

	it.concurrent('halos both a note and its tab fret', async () => {
		const { result: count, png } = await renderer.render(
			'structure_notation_and_tab_parts.musicxml',
			{},
			{ fn: decorateAllTargets, arg: 'halo' },
		);
		expect(count).toBeGreaterThan(0);
		expect(png).toMatchScreenshot('decoration_tab_halo.png');
	});
});

// Runs in the page via toString(), so it must stay self-contained: no closing over test scope.
function decorateAllTargets(
	score: Score,
	container: HTMLDivElement,
	mode: 'color' | 'halo',
) {
	const canvas = container.querySelector('canvas');
	if (!canvas) {
		throw new Error('canvas not found');
	}
	// Hover the whole canvas to collect every decoratable target under the pointer
	// (noteheads and tab frets), deduped by identity.
	const targets = new Set<Note | TabPosition>();
	score.events.on('pointermove', (e) => {
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
}
