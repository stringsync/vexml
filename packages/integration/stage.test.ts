import { describe, expect, it } from 'bun:test';
import { fixture, renderer } from './renderer';

describe('stage', () => {
	// Re-rendering into the same container must not lose the scroll-box styling. The keep-old-until-
	// new-ready pattern mounts a second Stage before disposing the first; disposing the first must not
	// stomp the second's position/overflow (the LIFO restore bug). Drives two real render() calls and
	// reads computed styles. A height cap makes the container a scroll box.
	it.concurrent('keeps scroll-box styles when re-rendering into a live container', async () => {
		const { result } = await renderer.render(
			'structure_single_stave.musicxml',
			{ height: 200 },
			'rerenderKeepsScrollBox',
			await fixture('structure_single_stave.musicxml'),
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

	// setMaxHeight is a live style write: the cap turns the container into a scroll box and removing
	// it lets the container size to the score again, all without re-rendering (the canvas element is
	// the same node before and after).
	it.concurrent('caps and uncaps the container height without re-rendering', async () => {
		const { result } = await renderer.render(
			'structure_single_stave.musicxml',
			{},
			'capUncapHeight',
		);

		expect(result.natural).toBeGreaterThan(100);
		expect(result.capped.height).toBe(100);
		expect(result.capped.scrollHeight).toBeGreaterThan(100);
		expect(result.capped.overflowY).toBe('auto');
		expect(result.capped.sameCanvas).toBe(true);
		expect(result.uncapped).toBe(result.natural);
	});

	// The managed canvas sizes itself to the score's intrinsic width by default, but a caller can
	// scale it to their container with an ordinary `.vexml-canvas { width: 100% }` rule — no
	// `!important`, because vexml's own default rule is wrapped in :where() (zero specificity).
	it.concurrent('caller CSS scales the canvas to its container without !important', async () => {
		const { result } = await renderer.render(
			'structure_single_stave.musicxml',
			{},
			'callerCssScales',
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
		const { result } = await renderer.render(
			'structure_single_stave.musicxml',
			{},
			'fitAndCenter',
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
