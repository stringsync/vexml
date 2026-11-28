import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';

// Behind Bars, p. 447: vocal melisma extender baseline level, endpoint at the last written
// notehead, continuation across short rests, and system-break continuation.

describe('Behind Bars vocal extenders (p. 447)', () => {
	it.concurrent('draws vocal-extenders', async () => {
		expect(await draw('vocal-extenders')).toMatchScreenshot(
			'engraving_vocal-extenders.png',
		);
	});

	// fix: #4767
	it.todo('vocal-extender-baseline-and-end (p. 447): extends across barlines');

	it.concurrent('vocal-extender-across-rests (p. 447): continues an extender uninterrupted beneath short rests within a syllable', async () => {
		const e = await engrave('vocal-extenders', 'vocal-extender-across-rests');
		const bottomLine = must(e.lines(2).at(-1), 'bottom stave line');
		const space = e.space(2);
		const lyric = must(
			e
				.inMeasure('lyric', 2)
				.find(
					(l) => l.box.y > bottomLine && l.box.y < bottomLine + space * 6.5,
				),
			'drift lyric in measure 3',
		);
		const heads = e.headsIn(2);
		const lastHead = must(heads.at(-1), 'final quarter note in measure 3');
		// Find the horizontal extender ink below the stave in measure 3 spanning past the rests to the last notehead.
		const mRect = e.measureRect(2);
		const extender = e.inks.find(
			(ink) =>
				ink.box.x >= mRect.x &&
				ink.box.x + ink.box.w <= mRect.x + mRect.w + 4 &&
				ink.box.y > bottomLine &&
				ink.box.y < bottomLine + space * 6.5 &&
				ink.box.h <= 4 &&
				ink.box.w > space * 5,
		);
		markBox(e, lyric.box, 'Syllable');
		if (extender) {
			markBox(e, extender.box, 'Extender across rests');
		}
		const reachesLastHead =
			extender !== undefined &&
			extender.box.x >= lyric.box.x + lyric.box.w - 4 &&
			extender.box.x + extender.box.w >= lastHead.head.x;
		expect(e.check(reachesLastHead)).toMatchMeasurements(true);
	});

	// fix: #4767
	it.todo('vocal-extender-system-break (p. 447): extends across system breaks');
});
