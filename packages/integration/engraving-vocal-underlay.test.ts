import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { bottomEdge } from './engraving-spanners';

// Behind Bars, pp. 437–440, 446: vocal tuplets above stave, text size and horizontal underlay
// baseline, single-note and melisma syllable alignment, vocal note spacing, and elision underties.

describe('Behind Bars vocal tuplets, text underlay, spacing, and elision (pp. 437–440, 446)', () => {
	it.concurrent('draws vocal-underlay', async () => {
		expect(await draw('vocal-underlay')).toMatchScreenshot(
			'engraving_vocal-underlay.png',
		);
	});

	it.todo(
		'vocal-tuplet-above (p. 437): places vocal tuplet indications above the stave away from lyrics',
	);

	it.concurrent('vocal-text-size-and-style (p. 438): sets sung text below the stave in consistent roman type without shrinking long syllables', async () => {
		const e = await engrave('vocal-underlay', 'vocal-text-size-and-style');
		const bottomLine = must(e.lines(6).at(-1), 'bottom stave line');
		const space = e.space(6);
		// Exclude short centred hyphens (h <= 0.4 space) to measure syllable text boxes.
		const lyrics = e
			.inMeasure('lyric', 6)
			.filter(
				(l) =>
					l.box.y > bottomLine &&
					l.box.y < bottomLine + space * 6.5 &&
					l.box.h > space * 0.4,
			);
		expect(lyrics.length).toBe(10);
		for (const l of lyrics) {
			markBox(e, l.box, 'Lyric');
		}
		const allBelowStave = lyrics.every((l) => l.box.y > bottomLine);
		const heights = lyrics.map((l) => l.box.h);
		const minH = Math.min(...heights);
		const maxH = Math.max(...heights);
		// Consistent readable height across lengthy sixteenth-note syllables and short quarter-note syllables.
		const consistentSize = minH >= space * 0.7 && maxH <= space * 1.9;
		expect(e.check([allBelowStave, consistentSize])).toMatchMeasurements([
			true,
			true,
		]);
	});

	it.concurrent('vocal-underlay-level-line (pp. 438–439): keeps sung text on one level horizontal baseline clear of low notes across the system', async () => {
		const e = await engrave('vocal-underlay', 'vocal-underlay-level-line');
		const bottomLine = must(e.lines(1).at(-1), 'bottom stave line');
		const space = e.space(1);
		const lyricsIn = (m: number) =>
			e
				.inMeasure('lyric', m)
				.filter(
					(l) =>
						l.box.y > bottomLine &&
						l.box.y < bottomLine + space * 6.5 &&
						l.box.h > space * 0.4,
				);
		const all = [...lyricsIn(1), ...lyricsIn(2)];
		expect(all.length).toBe(8);
		for (const l of all) {
			markBox(e, l.box, 'Lyric');
		}
		const tops = all.map((l) => l.box.y);
		// Syllables share one horizontal baseline so their top edges stay within ascender tolerance (~0.6 spaces).
		const flatBaseline = Math.max(...tops) - Math.min(...tops) <= space * 0.6;
		const lowNotes = [
			...e.headsIn(1).slice(2),
			must(e.headsIn(2)[2], 'A3 note in measure 3'),
		];
		const lowestHeadBottom = Math.max(
			...lowNotes.map((n) => bottomEdge(n.head)),
		);
		const clearOfLowNotes = all.every((l) => l.box.y > lowestHeadBottom);
		expect(e.check([flatBaseline, clearOfLowNotes])).toMatchMeasurements([
			true,
			true,
		]);
	});

	it.todo(
		'vocal-syllable-single-note-align (p. 439): centres single-note syllables under their noteheads and shifts very long syllables right',
	);

	// fix: #4765
	it.todo('vocal-syllable-melisma-left-align (p. 439): aligns left');

	it.concurrent('vocal-note-spacing-long-syllables (p. 440): expands short-note spacing for long syllables while keeping longer durations wider', async () => {
		const e = await engrave(
			'vocal-underlay',
			'vocal-note-spacing-long-syllables',
		);
		const bottomLine = must(e.lines(6).at(-1), 'bottom stave line');
		const space = e.space(6);
		const lyrics = e
			.inMeasure('lyric', 6)
			.filter(
				(l) =>
					l.box.y > bottomLine &&
					l.box.y < bottomLine + space * 6.5 &&
					l.box.h > space * 0.4,
			)
			.sort((a, b) => a.box.x - b.box.x);
		expect(lyrics.length).toBe(10);
		for (const l of lyrics) {
			markBox(e, l.box, 'Lyric');
		}
		const noOverlap = lyrics.every((l, i) => {
			const next = lyrics[i + 1];
			return !next || l.box.x + l.box.w < next.box.x;
		});
		const heads = e.headsIn(6);
		expect(heads.length).toBe(10);
		const sixteenthGap =
			must(heads[1], '2nd 16th').head.x - must(heads[0], '1st 16th').head.x;
		const quarterGap =
			must(heads[5], '2nd quarter').head.x -
			must(heads[4], '1st quarter').head.x;
		const quarterWider = quarterGap > sixteenthGap;
		expect(e.check([noOverlap, quarterWider])).toMatchMeasurements([
			true,
			true,
		]);
	});

	// fix: #4766
	it.todo('vocal-elision-undertie (p. 446): draws elision undertie');
});
