import { describe, expect, it } from 'bun:test';
import { stemDirection, stemTip } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge, rightEdge } from './engraving-spanners';

describe('Behind Bars two-note tremolos', () => {
	it.concurrent('draws single-staff two-note tremolos', async () => {
		expect(await draw('two-note-tremolos')).toMatchScreenshot(
			'engraving_two-note-tremolos.png',
		);
	});

	it.concurrent('tremolo-two-note-beam-design (pp. 225–226): draws beam-thickness strokes near stem ends and detached from stems', async () => {
		const e = await engrave(
			'two-note-tremolos',
			'tremolo-two-note-beam-design',
		);
		const heads = e.headsIn(0);
		const beams = e.inMeasure('beam', 0).sort((a, b) => a.box.x - b.box.x);
		expect(beams).toHaveLength(3);
		const space = e.space(0);
		const ok = [0, 1, 2].map((idx) => {
			const left = must(heads[idx * 2], `left note ${idx + 1}`);
			const right = must(heads[idx * 2 + 1], `right note ${idx + 1}`);
			const leftStem = must(left.stem, `left stem ${idx + 1}`);
			const rightStem = must(right.stem, `right stem ${idx + 1}`);
			const beam = must(beams[idx], `tremolo beam ${idx + 1}`);
			markBox(e, beam.box, `Tremolo ${idx + 1}`);
			const bands = beam.bandsAt(Math.round(centre(beam.box)));
			const thicknessOk =
				bands.length === 3 &&
				bands.every(([t, b]) => b - t >= 0.4 * space && b - t <= 0.65 * space);
			const dir = stemDirection(left);
			const avgTip = (stemTip(left) + stemTip(right)) / 2;
			const outerEdge = dir === 'up' ? beam.box.y : bottomEdge(beam.box);
			const nearEnds = Math.abs(outerEdge - avgTip) <= 0.5 * space;
			const detached =
				beam.box.x > rightEdge(leftStem.box) &&
				rightEdge(beam.box) < rightStem.box.x;
			return thicknessOk && nearEnds && detached;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('tremolo-two-note-stems (p. 226): points both stems the same way and encloses all tremolo beams', async () => {
		const e = await engrave('two-note-tremolos', 'tremolo-two-note-stems');
		const heads = e.headsIn(1);
		const beams = e.inMeasure('beam', 1).sort((a, b) => a.box.x - b.box.x);
		expect(beams).toHaveLength(2);
		const ok = [0, 1].map((idx) => {
			const left = must(heads[idx * 2], `left note ${idx + 1}`);
			const right = must(heads[idx * 2 + 1], `right note ${idx + 1}`);
			const leftStem = must(left.stem, `left stem ${idx + 1}`);
			const rightStem = must(right.stem, `right stem ${idx + 1}`);
			const beam = must(beams[idx], `tremolo beam ${idx + 1}`);
			markBox(e, beam.box, `Tremolo ${idx + 1}`);
			const space = e.space(1);
			const dirLeft = stemDirection(left);
			const dirRight = stemDirection(right);
			const sameDir = dirLeft !== null && dirLeft === dirRight;
			const leftBands = beam.bandsAt(Math.round(beam.box.x + 1));
			const rightBands = beam.bandsAt(Math.round(rightEdge(beam.box) - 2));
			const leftTop = Math.min(...leftBands.map(([t]) => t));
			const leftBottom = Math.max(...leftBands.map(([, b]) => b));
			const rightTop = Math.min(...rightBands.map(([t]) => t));
			const rightBottom = Math.max(...rightBands.map(([, b]) => b));
			// A slanted detached beam sits slightly past the shorter stem's tip across the stem gap.
			const slack = 0.4 * space;
			const leftEncloses =
				leftStem.box.y <= leftTop + slack &&
				bottomEdge(leftStem.box) >= leftBottom - slack;
			const rightEncloses =
				rightStem.box.y <= rightTop + slack &&
				bottomEdge(rightStem.box) >= rightBottom - slack;
			return sameDir && leftEncloses && rightEncloses;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true]);
	});

	it.todo('tremolo-two-note-octave-between (p. 226): wide-interval beams');

	it.concurrent('tremolo-two-note-whole-note (pp. 226–227): draws tremolo beams at notional stem positions on whole-note pairs', async () => {
		const e = await engrave('two-note-tremolos', 'tremolo-two-note-whole-note');
		const ok = [3, 4].map((measureIndex) => {
			const heads = e.headsIn(measureIndex);
			const beams = e.inMeasure('beam', measureIndex);
			const space = e.space(measureIndex);
			if (heads.length !== 2 || beams.length !== 1) {
				return false;
			}
			const left = must(heads[0], `measure ${measureIndex + 1} left`);
			const right = must(heads[1], `measure ${measureIndex + 1} right`);
			const beam = must(beams[0], `measure ${measureIndex + 1} beam`);
			markBox(e, beam.box, `Whole tremolo m.${measureIndex + 1}`);
			const bands = beam.bandsAt(Math.round(centre(beam.box)));
			const threeBeams =
				bands.length === 3 &&
				bands.every(([t, b]) => b - t >= 0.4 * space && b - t <= 0.65 * space);
			const centredX =
				Math.abs(
					centre(beam.box) - (centre(left.head) + centre(right.head)) / 2,
				) <=
				0.5 * space;
			const clearHeads =
				measureIndex === 3
					? bottomEdge(beam.box) < Math.min(left.head.y, right.head.y)
					: beam.box.y >
						Math.max(bottomEdge(left.head), bottomEdge(right.head));
			return threeBeams && centredX && clearHeads;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true]);
	});

	it.concurrent('tremolo-two-note-beam-length (p. 228): stops detached beams short of both stems with equal gaps', async () => {
		const e = await engrave(
			'two-note-tremolos',
			'tremolo-two-note-beam-length',
		);
		const heads = e.headsIn(5);
		const beams = e.inMeasure('beam', 5).sort((a, b) => a.box.x - b.box.x);
		expect(beams).toHaveLength(2);
		const ok = [0, 1].map((idx) => {
			const left = must(heads[idx * 2], `left note ${idx + 1}`);
			const right = must(heads[idx * 2 + 1], `right note ${idx + 1}`);
			const leftStem = must(left.stem, `left stem ${idx + 1}`);
			const rightStem = must(right.stem, `right stem ${idx + 1}`);
			const beam = must(beams[idx], `tremolo beam ${idx + 1}`);
			markBox(e, beam.box, `Tremolo ${idx + 1}`);
			const leftGap = beam.box.x - rightEdge(leftStem.box);
			const rightGap = rightStem.box.x - rightEdge(beam.box);
			return leftGap >= 2 && rightGap >= 2 && Math.abs(leftGap - rightGap) <= 2;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true]);
	});
});
