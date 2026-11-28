import { describe, expect, it } from 'bun:test';
import { draw, engrave, must, quarters } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { bottomEdge } from './engraving-spanners';

describe('Behind Bars choral reduction layout (p. 471)', () => {
	it.concurrent('draws rehearsal piano reduction staves smaller below choral staves with its own tempo marking', async () => {
		expect(await draw('choral-reduction')).toMatchScreenshot(
			'engraving_choral-reduction.png',
		);
	});

	it.concurrent('choral-reduction-small-staves (p. 471): draws rehearsal piano staves at 75% size with own tempo marking above', async () => {
		const e = await engrave(
			'choral-reduction',
			'choral-reduction-small-staves',
		);
		const vocalSpace = e.space(0, 0);
		const pianoTopLines = e.lines(0, 2, 1);
		const pianoBotLines = e.lines(0, 2, 2);
		const pianoTopSpace =
			must(pianoTopLines[1], 'piano treble line 2') -
			must(pianoTopLines[0], 'piano treble line 1');
		const pianoBotSpace =
			must(pianoBotLines[1], 'piano bass line 2') -
			must(pianoBotLines[0], 'piano bass line 1');
		const bassBottom = must(e.lines(0, 1, 1).at(-1), 'bass vocal bottom');
		const pianoTop = must(pianoTopLines[0], 'piano treble top');
		const keyboardTempo = e.inks.find(
			(ink) =>
				ink.kind === 'words' &&
				ink.box.y > bassBottom &&
				bottomEdge(ink.box) < pianoTop,
		);
		if (keyboardTempo) {
			markBox(e, keyboardTempo.box, 'Keyboard tempo');
		}
		const ratioTop = quarters(pianoTopSpace, vocalSpace);
		const ratioBot = quarters(pianoBotSpace, vocalSpace);
		expect(
			e.check([ratioTop, ratioBot, keyboardTempo !== undefined]),
		).toMatchMeasurements([0.75, 0.75, true]);
	});
});
