import { describe, expect, it } from 'bun:test';
import type { Box } from './engraving-ink';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge, rightEdge } from './engraving-spanners';

function unionBox(boxes: Box[]): Box {
	const x = Math.min(...boxes.map((b) => b.x));
	const y = Math.min(...boxes.map((b) => b.y));
	const r = Math.max(...boxes.map((b) => rightEdge(b)));
	const b = Math.max(...boxes.map((b) => bottomEdge(b)));
	return { x, y, w: r - x, h: b - y };
}

describe('Behind Bars tuplet ratios and nested tuplets', () => {
	it.concurrent('draws tuplet ratios, cross-barline tuplets and nested tuplets', async () => {
		expect(await draw('tuplet-ratios')).toMatchScreenshot(
			'engraving_tuplet-ratios.png',
		);
	});

	it.concurrent('tuplet-ratio-colon (p. 207): draws a full tuplet ratio with a colon', async () => {
		const e = await engrave('tuplet-ratios', 'tuplet-ratio-colon');
		const tuplets = e.inMeasure('tuplet', 0);
		expect(tuplets).toHaveLength(1);
		const t = must(tuplets[0], 'tuplet');
		markBox(e, t.box, '5:3 ratio');
		// A full "5:3" ratio is substantially wider than a single digit (at least 1.5 stave spaces).
		expect(e.check(t.box.w >= 1.5 * e.space(0))).toMatchMeasurements(true);
	});

	it.concurrent('tuplet-across-barline (p. 210): extends an unbroken tuplet bracket across a barline', async () => {
		const e = await engrave('tuplet-ratios', 'tuplet-across-barline');
		const m2 = e.measureRect(1);
		const m3 = e.measureRect(2);
		const barlineX = m3.x;
		const topLine = must(e.lines(1)[0], 'top stave line');
		const space = e.space(1);
		const cross = e.of('tuplet').filter((t) => {
			const cy = t.box.y + t.box.h / 2;
			return (
				t.box.x < barlineX &&
				rightEdge(t.box) > barlineX &&
				cy < topLine &&
				cy > topLine - 8 * space
			);
		});
		expect(cross).toHaveLength(1);
		const t = must(cross[0], 'cross-barline tuplet');
		markBox(e, t.box, '6 across barline');
		const firstHead = must(e.headsIn(1)[0], 'first tuplet note').head;
		const lastHead = must(e.headsIn(2)[2], 'last tuplet note').head;
		const spansBothBars =
			t.box.x <= firstHead.x &&
			rightEdge(t.box) >= rightEdge(lastHead) &&
			t.box.x >= m2.x &&
			rightEdge(t.box) <= rightEdge(m3);
		const startMargin = firstHead.x - t.box.x;
		const endMargin = rightEdge(t.box) - rightEdge(lastHead);
		const symmetricMargins = Math.abs(startMargin - endMargin) <= 0.25 * space;
		const clearOfStave = bottomEdge(t.box) < topLine;
		expect(
			e.check([spansBothBars, symmetricMargins, clearOfStave]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('tuplet-ratio-note-value (p. 208): draws note-value glyphs beside the numerals in a tuplet ratio', async () => {
		const e = await engrave('tuplet-ratios', 'tuplet-ratio-note-value');
		const topLine = must(e.lines(3)[0], 'top stave line');
		const tuplets = e.inMeasure('tuplet', 3).filter((t) => t.box.y < topLine);
		expect(tuplets.length).toBeGreaterThanOrEqual(1);
		const box = unionBox(tuplets.map((t) => t.box));
		markBox(e, box, '4q:3e ratio');
		const heads = e.headsIn(3);
		const span =
			must(heads[3], 'last tuplet note').head.x -
			must(heads[0], 'first tuplet note').head.x;
		const clearOfStave = bottomEdge(box) < topLine;
		expect(
			e.check(box.w >= span && box.h >= 1.2 * e.space(3) && clearOfStave),
		).toMatchMeasurements(true);
	});

	it.concurrent('tuplet-nested-outer-bracket (p. 213): encloses the outer numeral of a nested tuplet in a bracket even when beamed', async () => {
		const e = await engrave('tuplet-ratios', 'tuplet-nested-outer-bracket');
		const tuplets = e.inMeasure('tuplet', 4);
		expect(tuplets).toHaveLength(8);
		const midX = e.measureRect(4).x + e.measureRect(4).w / 2;
		const left = tuplets.filter((t) => centre(t.box) < midX);
		const right = tuplets.filter((t) => centre(t.box) >= midX);
		const outerUp = must(
			left.sort((a, b) => b.box.w - a.box.w)[0],
			'outer stem-up tuplet',
		);
		const outerDown = must(
			right.sort((a, b) => b.box.w - a.box.w)[0],
			'outer stem-down tuplet',
		);
		const heads = e.headsIn(4);
		const firstUp = must(heads[0], 'first stem-up note').head;
		const lastUp = must(heads[8], 'last stem-up note').head;
		const firstDown = must(heads[9], 'first stem-down note').head;
		const lastDown = must(heads[17], 'last stem-down note').head;
		markBox(e, outerUp.box, 'Outer bracket (up)');
		markBox(e, outerDown.box, 'Outer bracket (down)');
		const spansUp =
			outerUp.box.x <= firstUp.x && rightEdge(outerUp.box) >= rightEdge(lastUp);
		const spansDown =
			outerDown.box.x <= firstDown.x &&
			rightEdge(outerDown.box) >= rightEdge(lastDown);
		expect(e.check([spansUp, spansDown])).toMatchMeasurements([true, true]);
	});

	it.concurrent('tuplet-nested-opposite-sides (p. 214): places nested tuplet indications on opposite sides, outer on the stem side', async () => {
		const e = await engrave('tuplet-ratios', 'tuplet-nested-opposite-sides');
		const tuplets = e.inMeasure('tuplet', 4);
		expect(tuplets).toHaveLength(8);
		const topLine = must(e.lines(4)[0], 'top stave line');
		const bottomLine = must(e.lines(4)[4], 'bottom stave line');
		const midX = e.measureRect(4).x + e.measureRect(4).w / 2;
		const left = tuplets.filter((t) => centre(t.box) < midX);
		const right = tuplets.filter((t) => centre(t.box) >= midX);
		const outerUp = must(
			left.sort((a, b) => b.box.w - a.box.w)[0],
			'outer stem-up tuplet',
		);
		const innerUp = left.filter((t) => t !== outerUp);
		const outerDown = must(
			right.sort((a, b) => b.box.w - a.box.w)[0],
			'outer stem-down tuplet',
		);
		const innerDown = right.filter((t) => t !== outerDown);
		markBox(e, outerUp.box, 'Outer stem-up (above)');
		markBox(e, unionBox(innerUp.map((t) => t.box)), 'Inner stem-up (below)');
		markBox(e, outerDown.box, 'Outer stem-down (below)');
		markBox(
			e,
			unionBox(innerDown.map((t) => t.box)),
			'Inner stem-down (above)',
		);
		const upOpposite =
			bottomEdge(outerUp.box) < topLine &&
			innerUp.every((inner) => inner.box.y > bottomLine);
		const downOpposite =
			outerDown.box.y > bottomLine &&
			innerDown.every((inner) => bottomEdge(inner.box) < topLine);
		expect(e.check([upOpposite, downOpposite])).toMatchMeasurements([
			true,
			true,
		]);
	});

	it.concurrent('tuplet-nested-same-side (p. 214): places the outer tuplet further from the notes than inner tuplets on the same side', async () => {
		const e = await engrave('tuplet-ratios', 'tuplet-nested-same-side');
		const tuplets = e.inMeasure('tuplet', 5);
		expect(tuplets).toHaveLength(8);
		const midX = e.measureRect(5).x + e.measureRect(5).w / 2;
		const left = tuplets.filter((t) => centre(t.box) < midX);
		const right = tuplets.filter((t) => centre(t.box) >= midX);
		const outerAbove = must(
			left.sort((a, b) => b.box.w - a.box.w)[0],
			'outer above tuplet',
		);
		const innerAbove = left.filter((t) => t !== outerAbove);
		const outerBelow = must(
			right.sort((a, b) => b.box.w - a.box.w)[0],
			'outer below tuplet',
		);
		const innerBelow = right.filter((t) => t !== outerBelow);
		markBox(e, outerAbove.box, 'Outer above');
		markBox(e, outerBelow.box, 'Outer below');
		const aboveClear = innerAbove.every(
			(inner) => outerAbove.box.y < inner.box.y,
		);
		const belowClear = innerBelow.every(
			(inner) => bottomEdge(outerBelow.box) > bottomEdge(inner.box),
		);
		expect(e.check([aboveClear, belowClear])).toMatchMeasurements([true, true]);
	});
});
