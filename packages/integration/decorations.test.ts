import { describe, expect, it } from 'bun:test';
import type { VexmlContext } from '@vexml/renderer';
import { testing } from './setup';

// Decorations end to end: render, toggle a decoration on every target, and screenshot the
// composite (base engraving + the decoration overlay). The drawing logic itself is unit-tested
// in packages/vexml/decorations.test.ts; this proves it lands on the score, aligned.
//
// Both noteheads (Note) and tab fret numbers (TabPosition) are decoratable, with their own
// drawColor stamps, so decorateAllTargets collects both: a notation-only document yields only
// notes, a tab document lights up both the heads and the frets.

describe('decorations', () => {
	it.concurrent('draws a colored note', async () => {
		const { result: count, image } = await testing.eval(
			'note.musicxml',
			{},
			decorateAllTargets,
			'color',
		);
		expect(count).toBeGreaterThan(0);
		expect(image).toMatchScreenshot('decoration_color.png');
	});

	it.concurrent('draws a halo behind a note', async () => {
		const { result: count, image } = await testing.eval(
			'note.musicxml',
			{},
			decorateAllTargets,
			'halo',
		);
		expect(count).toBeGreaterThan(0);
		expect(image).toMatchScreenshot('decoration_halo.png');
	});

	// Chords whose seconds displace a notehead off the stem column (chord.musicxml: the C5/D5
	// second in M2, and the G5/A5 second atop the M4 chord). Every head must recolor completely,
	// including the displaced ones — their stamps once clipped to the normal column's rect.
	it.concurrent('colors displaced second noteheads completely', async () => {
		const { result: count, image } = await testing.eval(
			'chord.musicxml',
			{},
			decorateAllTargets,
			'color',
		);
		expect(count).toBeGreaterThan(0);
		expect(image).toMatchScreenshot('decoration_chord_color.png');
	});

	// A notation+tab document: the notation staff's noteheads and the tab staff's fret numbers both
	// light up. Color restamps each notehead glyph and each fret digit in blue; halo draws a soft
	// blue circle behind every notehead and every fret.
	it.concurrent('colors both a note and its tab fret', async () => {
		const { result: count, image } = await testing.eval(
			'structure_notation_and_tab_parts.musicxml',
			{},
			decorateAllTargets,
			'color',
		);
		expect(count).toBeGreaterThan(0);
		expect(image).toMatchScreenshot('decoration_tab_color.png');
	});

	it.concurrent('halos both a note and its tab fret', async () => {
		const { result: count, image } = await testing.eval(
			'structure_notation_and_tab_parts.musicxml',
			{},
			decorateAllTargets,
			'halo',
		);
		expect(count).toBeGreaterThan(0);
		expect(image).toMatchScreenshot('decoration_tab_halo.png');
	});
});

// Runs in the page via toString(), so it must stay self-contained: no closing over test scope.
function decorateAllTargets({ score }: VexmlContext, mode: 'color' | 'halo') {
	// Reaching a target via the pointer is proven once in events.test.ts; here the elements
	// index enumerates them directly. A tab note's visible glyph is its fret (TabPosition),
	// a notation note's is its notehead — decorate whichever this note shows, exactly once
	// (both wrappers stamp the same glyph, so decorating a note AND its fret double-prints).
	const targets = score
		.getElements()
		.notes()
		.map((note) => note.getTabPosition() ?? note);
	for (const target of targets) {
		if (mode === 'color') {
			target.color.on('#2962ff');
		} else {
			target.halo.on('rgba(41, 98, 255, 0.35)');
		}
	}
	return targets.length;
}
