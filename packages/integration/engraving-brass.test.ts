import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge } from './engraving-spanners';

describe('Behind Bars brass mutes and techniques', () => {
	it.concurrent('draws brass hand-stopped, half-stopped, and jazz inflection marks', async () => {
		expect(await draw('brass')).toMatchScreenshot('engraving_brass.png');
	});

	it.concurrent('brass-hand-stopped-open (p. 263): places + above hand-stopped notes and o above the next open note', async () => {
		const e = await engrave('brass', 'brass-hand-stopped-open');
		const top = must(e.lines(0)[0], 'top stave line m1');
		const space = e.space(0);
		const heads = e.headsIn(0);
		const stopped = e.inMeasure('stopped', 0).sort((a, b) => a.box.x - b.box.x);
		const opens = e
			.inMeasure('brass-open', 0)
			.sort((a, b) => a.box.x - b.box.x);
		expect(stopped).toHaveLength(3);
		expect(opens).toHaveLength(1);
		const marks = [...stopped, must(opens[0], 'open circle')];
		const ok = marks.map((mark, i) => {
			const note = must(heads[i], `note ${i + 1}`);
			markBox(e, mark.box, i < 3 ? `Stopped ${i + 1}` : 'Open');
			return (
				bottomEdge(mark.box) < top &&
				Math.abs(centre(mark.box) - centre(note.head)) <= 0.35 * space
			);
		});
		expect(e.check(ok)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('brass-half-stopped (p. 264): places the circled plus above the stave centred over each half-stopped note', async () => {
		const e = await engrave('brass', 'brass-half-stopped');
		const top = must(e.lines(1)[0], 'top stave line m2');
		const space = e.space(1);
		const heads = e.headsIn(1);
		const halfMuted = e
			.inMeasure('half-muted', 1)
			.sort((a, b) => a.box.x - b.box.x);
		expect(halfMuted).toHaveLength(3);
		const targets = [
			must(heads[0], 'F4'),
			must(heads[1], 'D5'),
			must(heads[3], 'A4'),
		];
		const ok = targets.map((note, i) => {
			const mark = must(halfMuted[i], `half-muted ${i + 1}`);
			markBox(e, mark.box, `Half-stopped ${i + 1}`);
			return (
				bottomEdge(mark.box) < top &&
				Math.abs(centre(mark.box) - centre(note.head)) <= 0.35 * space
			);
		});
		expect(e.check(ok)).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('brass-jazz-inflections (p. 267): draws scoop and plop to the left of their noteheads and doit and falloff to the right', async () => {
		const e = await engrave('brass', 'brass-jazz-inflections');
		const heads = e.headsIn(2);
		const marks = e.inMeasure('ornament', 2).sort((a, b) => a.box.x - b.box.x);
		expect(marks).toHaveLength(4);
		const [scoop, plop, doit, falloff] = [
			must(marks[0], 'scoop'),
			must(marks[1], 'plop'),
			must(marks[2], 'doit'),
			must(marks[3], 'falloff'),
		];
		const [n0, n1, n2, n3] = [
			must(heads[0], 'A4 scoop'),
			must(heads[1], 'C5 plop'),
			must(heads[2], 'B4 doit'),
			must(heads[3], 'G4 falloff'),
		];
		markBox(e, scoop.box, 'Scoop');
		markBox(e, plop.box, 'Plop');
		markBox(e, doit.box, 'Doit');
		markBox(e, falloff.box, 'Falloff');
		const ok = [
			centre(scoop.box) < n0.head.x,
			centre(plop.box) < n1.head.x,
			centre(doit.box) > n2.head.x + n2.head.w,
			centre(falloff.box) > n3.head.x + n3.head.w,
		];
		expect(e.check(ok)).toMatchMeasurements([true, true, true, true]);
	});
});
