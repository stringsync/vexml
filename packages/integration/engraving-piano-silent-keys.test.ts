import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';

describe('Behind Bars silently depressed piano keys', () => {
	it.concurrent('draws piano-silent-keys', async () => {
		expect(await draw('piano-silent-keys')).toMatchScreenshot(
			'engraving_piano-silent-keys.png',
		);
	});

	it.concurrent('piano-silent-key-diamond (p. 338): uses hollow diamond noteheads for half notes and filled black diamonds for quarter and shorter notes', async () => {
		const e = await engrave('piano-silent-keys', 'piano-silent-key-diamond');
		const heads = e.inMeasure('notehead', 0).sort((a, b) => a.box.x - b.box.x);
		const halfHead = must(heads[0], 'M1 half diamond');
		const quarterHead = must(heads[1], 'M1 quarter diamond');
		const eighthHead = must(heads[2], 'M1 eighth diamond');
		for (const h of [halfHead, quarterHead, eighthHead]) {
			markBox(e, h.box, 'Diamond head');
		}
		// Hollow diamond has two vertical ink bands at its horizontal centre (top & bottom rims);
		// filled black diamond has a single solid vertical ink band across its centre.
		const centreBandCount = (head: typeof halfHead) => {
			const cx = Math.round(head.box.x + head.box.w / 2);
			return head.bandsAt(cx).length;
		};
		expect(
			e.check([
				centreBandCount(halfHead) >= 2,
				centreBandCount(quarterHead) === 1,
				centreBandCount(eighthHead) === 1,
			]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('piano-silent-retake-dotted-tie (p. 338): connects a struck note to a silently depressed diamond note with a dotted tie', async () => {
		const e = await engrave(
			'piano-silent-keys',
			'piano-silent-retake-dotted-tie',
		);
		const tie = must(e.inMeasure('tie', 1)[0], 'M2 dotted tie');
		markBox(e, tie.box, 'Dotted tie');
		// Count horizontal ink runs across the tie's x-span: a dotted tie has multiple separated dots.
		let runs = 0;
		let inInk = false;
		for (
			let x = Math.floor(tie.box.x);
			x <= Math.ceil(tie.box.x + tie.box.w);
			x++
		) {
			const has = tie.bandsAt(x).length > 0;
			if (has && !inInk) {
				runs++;
			}
			inInk = has;
		}
		expect(e.check([runs >= 3])).toMatchMeasurements([true]);
	});
});
