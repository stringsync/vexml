import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge } from './engraving-spanners';

describe('Behind Bars multi-staff two-note tremolos', () => {
	it.concurrent('draws multi-staff two-note tremolos and alignment', async () => {
		expect(await draw('two-note-tremolos-multi')).toMatchScreenshot(
			'engraving_two-note-tremolos-multi.png',
		);
	});

	it.concurrent('tremolo-two-note-cross-staff (p. 227): draws tremolo beams between staves for stemmed and whole-note cross-staff pairs', async () => {
		const e = await engrave(
			'two-note-tremolos-multi',
			'tremolo-two-note-cross-staff',
		);
		const checkBetweenStaves = (
			measureIndex: number,
			expectedCount: number,
		) => {
			const beams = e
				.inMeasure('beam', measureIndex)
				.sort((a, b) => a.box.x - b.box.x);
			const upperBottom = must(
				e.lines(measureIndex, 0, 1)[4],
				`m.${measureIndex + 1} upper stave bottom`,
			);
			const lowerTop = must(
				e.lines(measureIndex, 0, 2)[0],
				`m.${measureIndex + 1} lower stave top`,
			);
			const space = e.space(measureIndex);
			if (beams.length !== expectedCount) {
				return false;
			}
			return beams.every((beam, idx) => {
				markBox(e, beam.box, `Cross m.${measureIndex + 1} #${idx + 1}`);
				const bands = beam.bandsAt(Math.round(centre(beam.box)));
				const threeBeams =
					bands.length === 3 &&
					bands.every(
						([t, b]) => b - t >= 0.4 * space && b - t <= 0.65 * space,
					);
				const between =
					beam.box.y > upperBottom && bottomEdge(beam.box) < lowerTop;
				return threeBeams && between;
			});
		};
		const ok = [checkBetweenStaves(0, 2), checkBetweenStaves(1, 1)];
		expect(e.check(ok)).toMatchMeasurements([true, true]);
	});

	it.concurrent('tremolo-two-note-alignment (p. 227): aligns the second note of a two-note tremolo at the rhythmic midpoint', async () => {
		const e = await engrave(
			'two-note-tremolos-multi',
			'tremolo-two-note-alignment',
		);
		const checkAligned = (
			measureIndex: number,
			upperIndex: number,
			lowerIndex: number,
			label: string,
		) => {
			const upper = e.headsIn(measureIndex, { part: 0, voice: '1' });
			const lower = e.headsIn(measureIndex, { part: 0, voice: '2' });
			const u = must(upper[upperIndex], `${label} upper`);
			const l = must(lower[lowerIndex], `${label} lower`);
			markBox(e, u.head, `${label} upper`);
			markBox(e, l.head, `${label} lower`);
			const space = e.space(measureIndex);
			return Math.abs(u.head.x - l.head.x) <= 0.25 * space;
		};
		const ok = [
			checkAligned(2, 1, 4, 'm.3 whole C5 / G3'),
			checkAligned(3, 1, 2, 'm.4 half B4 / E3'),
			checkAligned(3, 3, 5, 'm.4 quarter C5 / A3'),
		];
		expect(e.check(ok)).toMatchMeasurements([true, true, true]);
	});
});
