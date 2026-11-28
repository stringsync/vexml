import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { bottomEdge, rightEdge } from './engraving-spanners';

describe('Behind Bars alternating and unconventional metres', () => {
	it.concurrent('draws alternating, mixed-denominator, and non-binary time signatures', async () => {
		expect(await draw('metre-indications')).toMatchScreenshot(
			'engraving_metre-indications.png',
		);
	});

	it.concurrent('metre-alternating-plus (p. 179): joins fixed alternating time signatures with a plus sign', async () => {
		const e = await engrave('metre-indications', 'metre-alternating-plus');
		const time = must(e.inMeasure('timesignature', 0)[0], 'time signature');
		const first = must(e.headsIn(0)[0], 'first note').head;
		const space = e.space(0);
		markBox(e, time.box, '2/4 + 6/8');
		expect(
			e.check([time.box.w >= 2.5 * space, rightEdge(time.box) < first.x]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('metre-alternating-hyphen (p. 179): joins irregularly alternating time signatures with a hyphen', async () => {
		const e = await engrave('metre-indications', 'metre-alternating-hyphen');
		const time = must(e.inMeasure('timesignature', 1)[0], 'time signature');
		const first = must(e.headsIn(1)[0], 'first note').head;
		const space = e.space(1);
		markBox(e, time.box, '2/4 - 3/4');
		expect(
			e.check([time.box.w >= 2.5 * space, rightEdge(time.box) < first.x]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('metre-mixed-denominators (p. 180): joins mixed-denominator time signatures with plus signs', async () => {
		const e = await engrave('metre-indications', 'metre-mixed-denominators');
		const first = must(e.headsIn(2)[0], 'first note').head;
		const time = must(
			e.inMeasure('timesignature', 2).find((t) => t.box.x < first.x),
			'opening time signature',
		);
		const space = e.space(2);
		markBox(e, time.box, '2/4 + 3/8 + 3/16');
		expect(
			e.check([time.box.w >= 4.5 * space, rightEdge(time.box) < first.x]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('metre-non-binary-denominator (pp. 180-181): renders non-power-of-two denominators as stacked numerals', async () => {
		const e = await engrave(
			'metre-indications',
			'metre-non-binary-denominator',
		);
		const results = [3, 4].map((measure, i) => {
			const time = must(
				e.inMeasure('timesignature', measure)[0],
				`time signature in M${measure + 1}`,
			);
			const first = must(e.headsIn(measure)[0], 'first note').head;
			const lines = e.lines(measure);
			const top = must(lines[0], 'top stave line');
			const bottom = must(lines[4], 'bottom stave line');
			const space = e.space(measure);
			markBox(e, time.box, i === 0 ? '4/6' : '5/10');
			return (
				time.box.y >= top - 0.5 * space &&
				bottomEdge(time.box) <= bottom + 0.5 * space &&
				rightEdge(time.box) < first.x
			);
		});
		expect(e.check(results)).toMatchMeasurements([true, true]);
	});
});
