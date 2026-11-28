import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { bottomEdge } from './engraving-spanners';

describe('Behind Bars stage works character layout and stage directions (pp. 470–471)', () => {
	it.concurrent('draws stage directions above tempo and character style directions above individual staves', async () => {
		expect(await draw('choral-stage-characters')).toMatchScreenshot(
			'engraving_choral-stage-characters.png',
		);
	});

	it.concurrent('choral-stage-directions-above-tempo (pp. 470–471): stacks character directions above pp and Allegro molto above stage text', async () => {
		const e = await engrave(
			'choral-stage-characters',
			'choral-stage-directions-above-tempo',
		);
		const annTop = must(e.lines(0, 0, 1)[0], 'Ann stave top');
		const annBottom = must(e.lines(0, 0, 1).at(-1), 'Ann stave bottom');
		const jackTop = must(e.lines(0, 1, 1)[0], 'Jack stave top');
		const annBeat3 = must(
			e.headsIn(0, { part: 0 })[0],
			'Ann beat 3 entry note',
		);
		const words = e.inks.filter((ink) => ink.kind === 'words');
		const aboveAnn = words.filter((ink) => bottomEdge(ink.box) < annTop);
		const aboveJack = words.filter(
			(ink) => ink.box.y > annBottom && bottomEdge(ink.box) < jackTop,
		);
		const topLeft = aboveAnn
			.filter((ink) => ink.box.x < annBeat3.head.x - 20)
			.sort((a, b) => a.box.y - b.box.y);
		const annEntry = aboveAnn
			.filter((ink) => ink.box.x >= annBeat3.head.x - 20)
			.sort((a, b) => a.box.y - b.box.y);
		const jackEntry = [...aboveJack].sort((a, b) => a.box.y - b.box.y);
		const [allegro, stageText] = topLeft;
		const [annChar, annPp] = annEntry;
		const [jackChar, jackPp] = jackEntry;
		if (allegro) {
			markBox(e, allegro.box, 'Allegro molto');
		}
		if (stageText) {
			markBox(e, stageText.box, 'Stage direction');
		}
		if (annChar) {
			markBox(e, annChar.box, 'Ann character');
		}
		if (annPp) {
			markBox(e, annPp.box, 'Ann pp');
		}
		if (jackChar) {
			markBox(e, jackChar.box, 'Jack character');
		}
		if (jackPp) {
			markBox(e, jackPp.box, 'Jack pp');
		}
		const tempoAboveStage =
			topLeft.length === 2 &&
			allegro !== undefined &&
			stageText !== undefined &&
			allegro.box.w < stageText.box.w &&
			bottomEdge(allegro.box) < stageText.box.y;
		const annCharAbovePp =
			annEntry.length === 2 &&
			annChar !== undefined &&
			annPp !== undefined &&
			annChar.box.w > annPp.box.w &&
			bottomEdge(annChar.box) < annPp.box.y;
		const jackCharAbovePp =
			jackEntry.length === 2 &&
			jackChar !== undefined &&
			jackPp !== undefined &&
			jackChar.box.w > jackPp.box.w &&
			bottomEdge(jackChar.box) < jackPp.box.y;
		expect(
			e.check([tempoAboveStage, annCharAbovePp, jackCharAbovePp]),
		).toMatchMeasurements([true, true, true]);
	});
});
