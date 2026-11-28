import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { bottomEdge } from './engraving-spanners';

// Behind Bars, pp. 433–434: vocal tenor octave-down treble clef, dynamics/expression above
// the stave, and vocal articulation placement with lyrics.

describe('Behind Bars vocal clefs, dynamics, and articulations (pp. 433–434)', () => {
	it.concurrent('draws vocal-tenor-clef', async () => {
		expect(await draw('vocal-tenor-clef')).toMatchScreenshot(
			'engraving_vocal-tenor-clef.png',
		);
	});

	it.concurrent('draws vocal-clef-dynamics', async () => {
		expect(await draw('vocal-clef-dynamics')).toMatchScreenshot(
			'engraving_vocal-clef-dynamics.png',
		);
	});

	it.concurrent('vocal-tenor-octave-clef (p. 433): draws an octave-down treble clef with a small 8 centred beneath its tail', async () => {
		const e = await engrave('vocal-tenor-clef', 'vocal-tenor-octave-clef');
		const clef = must(e.inMeasure('clef', 0)[0], 'tenor octave clef');
		const bottomLine = must(e.lines(0)[4], 'bottom stave line');
		const space = e.space(0);
		markBox(e, clef.box, 'Tenor 8vb clef');
		const belowBottomSpaces = (bottomEdge(clef.box) - bottomLine) / space;
		// Standard treble clef extends ~1.6 spaces below line 4; with the 8 beneath, it reaches >= 2.2 spaces.
		const hasSubscriptOctave =
			belowBottomSpaces >= 2.2 && belowBottomSpaces <= 4.0;
		expect(e.check(hasSubscriptOctave)).toMatchMeasurements(true);
	});

	it.todo(
		'vocal-dynamics-above (p. 434): places dynamics, hairpins, and expression text above the stave when lyrics are present',
	);

	it.todo(
		'vocal-articulation-placement (p. 434): keeps articulations clear of lyrics and prefers above-stave placement on low vocal notes',
	);
});
