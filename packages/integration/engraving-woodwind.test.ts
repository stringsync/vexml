import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge } from './engraving-spanners';

describe('Behind Bars woodwind and brass general topics, woodwind techniques', () => {
	it.concurrent('draws wind breath marks, woodwind harmonics, fingering holes, and key slaps', async () => {
		expect(await draw('woodwind')).toMatchScreenshot('engraving_woodwind.png');
	});

	it.concurrent('wind-breath-mark-tick (p. 246): draws a tick breath mark above the stave, wider than the comma after the next note', async () => {
		const e = await engrave('woodwind', 'wind-breath-mark-tick');
		const space = e.space(0);
		const top = must(e.lines(0)[0], 'top stave line m1');
		const marks = e
			.inMeasure('breath-mark', 0)
			.sort((a, b) => a.box.x - b.box.x);
		const tick = must(marks[0], 'tick in measure 1');
		const comma = must(marks[1], 'comma in measure 1');
		markBox(e, tick.box, 'Tick');
		markBox(e, comma.box, 'Comma');
		const above = bottomEdge(tick.box) <= top + 0.1 * space;
		const distinct = tick.box.w > comma.box.w + 0.05 * space;
		expect(e.check([marks.length === 2, above, distinct])).toMatchMeasurements([
			true,
			true,
			true,
		]);
	});

	it.concurrent('woodwind-harmonic-circle (p. 256): places a small open circle centred above each sounding-pitch harmonic', async () => {
		const e = await engrave('woodwind', 'woodwind-harmonic-circle');
		const top = must(e.lines(1)[0], 'top stave line m2');
		const space = e.space(1);
		const heads = e.headsIn(1);
		const circles = e
			.inMeasure('harmonic-circle', 1)
			.sort((a, b) => a.box.x - b.box.x);
		expect(circles).toHaveLength(3);
		const targets = [
			must(heads[0], 'G4'),
			must(heads[1], 'E5 beat 2'),
			must(heads[3], 'E5 beat 4'),
		];
		const ok = targets.map((note, i) => {
			const circle = must(circles[i], `harmonic circle ${i + 1}`);
			markBox(e, circle.box, `Harmonic ${i + 1}`);
			return (
				bottomEdge(circle.box) < top &&
				Math.abs(centre(circle.box) - centre(note.head)) <= 0.35 * space
			);
		});
		expect(e.check(ok)).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('woodwind-harmonic-fundamental-diamond (pp. 256-257): draws diamond fundamental below sounding pitch with harmonic circle above', async () => {
		const e = await engrave(
			'woodwind',
			'woodwind-harmonic-fundamental-diamond',
		);
		const space = e.space(2);
		const heads = e.headsIn(2);
		const circles = e
			.inMeasure('harmonic-circle', 2)
			.sort((a, b) => a.box.x - b.box.x);
		expect(heads).toHaveLength(4);
		expect(circles).toHaveLength(2);
		const pairs = [
			{
				fund: must(heads[0], 'C4 diamond'),
				sound: must(heads[1], 'C6 sounding'),
				circle: must(circles[0], 'circle 1'),
			},
			{
				fund: must(heads[2], 'D4 diamond'),
				sound: must(heads[3], 'A5 sounding'),
				circle: must(circles[1], 'circle 2'),
			},
		];
		const ok = pairs.map(({ fund, sound, circle }, i) => {
			markBox(e, fund.head, `Fund ${i + 1}`);
			markBox(e, sound.head, `Sound ${i + 1}`);
			markBox(e, circle.box, `Circle ${i + 1}`);
			return (
				fund.head.y > sound.head.y &&
				bottomEdge(circle.box) < sound.head.y &&
				Math.abs(centre(circle.box) - centre(sound.head)) <= 0.35 * space
			);
		});
		expect(e.check(ok)).toMatchMeasurements([true, true]);
	});

	it.concurrent('woodwind-double-harmonic-circles (p. 257): stacks two harmonic circles vertically above each double-harmonic chord', async () => {
		const e = await engrave('woodwind', 'woodwind-double-harmonic-circles');
		const top = must(e.lines(3)[0], 'top stave line m4');
		const circles = e
			.inMeasure('harmonic-circle', 3)
			.sort((a, b) => a.box.x - b.box.x || a.box.y - b.box.y);
		expect(circles).toHaveLength(4);
		const chords = [
			circles.slice(0, 2).sort((a, b) => a.box.y - b.box.y),
			circles.slice(2, 4).sort((a, b) => a.box.y - b.box.y),
		];
		const ok = chords.map((pair, i) => {
			const upper = must(pair[0], `chord ${i + 1} upper circle`);
			const lower = must(pair[1], `chord ${i + 1} lower circle`);
			markBox(e, upper.box, `Upper ${i + 1}`);
			markBox(e, lower.box, `Lower ${i + 1}`);
			return bottomEdge(lower.box) < top && bottomEdge(upper.box) < lower.box.y;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true]);
	});

	it.concurrent('woodwind-fingering-holes (p. 258): places open, closed, and half-open hole symbols above or below their notes', async () => {
		const e = await engrave('woodwind', 'woodwind-fingering-holes');
		const lines = e.lines(4);
		const top = must(lines[0], 'top stave line m5');
		const bottom = must(lines[4], 'bottom stave line m5');
		const space = e.space(4);
		const heads = e.headsIn(4);
		const holes = e.inMeasure('hole', 4).sort((a, b) => a.box.x - b.box.x);
		expect(holes).toHaveLength(4);
		const ok = heads.map((note, i) => {
			const hole = must(holes[i], `hole ${i + 1}`);
			markBox(e, hole.box, `Hole ${i + 1}`);
			const centred =
				Math.abs(centre(hole.box) - centre(note.head)) <= 0.35 * space;
			const placed = i < 3 ? bottomEdge(hole.box) < top : hole.box.y > bottom;
			return centred && placed;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('woodwind-key-slap-plus (p. 259): places the key-slap plus sign above the stave centred over its note', async () => {
		const e = await engrave('woodwind', 'woodwind-key-slap-plus');
		const top = must(e.lines(5)[0], 'top stave line m6');
		const space = e.space(5);
		const heads = e.headsIn(5);
		const pluses = e.inMeasure('stopped', 5).sort((a, b) => a.box.x - b.box.x);
		expect(pluses).toHaveLength(3);
		const ok = pluses.map((plus, i) => {
			const note = must(heads[i], `note ${i + 1}`);
			markBox(e, plus.box, `Plus ${i + 1}`);
			return (
				bottomEdge(plus.box) < top &&
				Math.abs(centre(plus.box) - centre(note.head)) <= 0.35 * space
			);
		});
		expect(e.check(ok)).toMatchMeasurements([true, true, true]);
	});
});
