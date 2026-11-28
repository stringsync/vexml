import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge, rightEdge } from './engraving-spanners';

describe('Behind Bars repeat-beat and repeat-bar abbreviations', () => {
	it.concurrent('draws beat-repeat slashes and single/two-bar repeat signs', async () => {
		expect(await draw('repeat-abbreviations')).toMatchScreenshot(
			'engraving_repeat-abbreviations.png',
		);
	});

	it.concurrent('repeat-beat-slash (p. 230): draws beat-repeat slashes centred in the middle two spaces with no leftover stems or beams', async () => {
		const e = await engrave('repeat-abbreviations', 'repeat-beat-slash');
		const checkMeasure = (
			measure: number,
			expectedSigns: number,
			expectedBeams: number,
			expectedStems: number,
		) => {
			const space = e.space(measure);
			const middleLineY = e.middle(measure);
			const signs = e.inMeasure('measure-style', measure);
			const beams = e.inMeasure('beam', measure);
			const stems = e.inMeasure('stem', measure);
			for (const [i, sign] of signs.entries()) {
				markBox(e, sign.box, `M${measure + 1} slash ${i + 1}`);
			}
			const verticallyCentred =
				signs.length === expectedSigns &&
				signs.every((sign) => {
					const midY = (sign.box.y + bottomEdge(sign.box)) / 2;
					return Math.abs(midY - middleLineY) <= 0.35 * space;
				});
			const heightOk =
				signs.length === expectedSigns &&
				signs.every(
					(sign) => sign.box.h >= 1.5 * space && sign.box.h <= 2.6 * space,
				);
			const noLeftoverBeams = beams.length === expectedBeams;
			const noLeftoverStems = stems.length === expectedStems;
			return [verticallyCentred, heightOk, noLeftoverBeams, noLeftoverStems];
		};
		// Measure 1: beamed eighth pair + 1-slash repeat, beamed sixteenth group + 2-slash repeat.
		// Measure 2: beamed thirty-second group + 3-slash repeat + half rest.
		expect(
			e.check([...checkMeasure(0, 2, 2, 6), ...checkMeasure(1, 1, 1, 8)]),
		).toMatchMeasurements([true, true, true, true, true, true, true, true]);
	});

	it.concurrent('repeat-single-bar-sign (pp. 231–232): centres the single-bar repeat sign in the middle two spaces and bar width', async () => {
		const e = await engrave('repeat-abbreviations', 'repeat-single-bar-sign');
		const rect = e.measureRect(3);
		const space = e.space(3);
		const middleLineY = e.middle(3);
		const sign = must(
			e.inMeasure('measure-style', 3)[0],
			'single-bar repeat sign',
		);
		markBox(e, sign.box, 'Single-bar repeat');
		const signMidY = (sign.box.y + bottomEdge(sign.box)) / 2;
		const barMidX = rect.x + rect.w / 2;
		const verticallyCentred = Math.abs(signMidY - middleLineY) <= 0.35 * space;
		const heightOk = sign.box.h >= 1.5 * space && sign.box.h <= 2.6 * space;
		const horizontallyCentred =
			Math.abs(centre(sign.box) - barMidX) <= 0.6 * space;
		expect(
			e.check([verticallyCentred, heightOk, horizontallyCentred]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('repeat-two-bar-sign (pp. 232–233): centres the two-bar repeat sign on the barline in the middle two spaces', async () => {
		const e = await engrave('repeat-abbreviations', 'repeat-two-bar-sign');
		const rect = e.measureRect(6);
		const lines = e.lines(6);
		const topLine = must(lines[0], 'top stave line');
		const bottomLine = must(lines[lines.length - 1], 'bottom stave line');
		const middleLineY = e.middle(6);
		const space = e.space(6);
		const barlineX = rightEdge(rect);
		const masks = e
			.of('measure-style')
			.filter(
				(m) =>
					rightEdge(m.box) >= barlineX - 2 * space &&
					m.box.x <= barlineX + 2 * space &&
					bottomEdge(m.box) > topLine,
			);
		const sign = must(masks[0], 'two-bar repeat sign');
		// The measure-style group includes the `2` numeral above the stave; measure the
		// repeat glyph ink inside the stave lines around the barline.
		const staveBands = sign
			.bandsAt(Math.round(barlineX))
			.filter(([t, b]) => t >= topLine && b <= bottomLine);
		const glyphTop = Math.min(...staveBands.map(([t]) => t));
		const glyphBottom = Math.max(...staveBands.map(([, b]) => b));
		markBox(
			e,
			{ x: sign.box.x, y: glyphTop, w: sign.box.w, h: glyphBottom - glyphTop },
			'Two-bar repeat',
		);
		const signMidY = (glyphTop + glyphBottom) / 2;
		const bisectsBarline = Math.abs(centre(sign.box) - barlineX) <= 0.5 * space;
		const verticallyCentred = Math.abs(signMidY - middleLineY) <= 0.4 * space;
		expect(e.check([bisectsBarline, verticallyCentred])).toMatchMeasurements([
			true,
			true,
		]);
	});
});
