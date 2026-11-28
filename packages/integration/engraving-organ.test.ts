import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { bottomEdge, rightEdge } from './engraving-spanners';

describe('Behind Bars organ notation', () => {
	it.concurrent('draws organ-three-stave', async () => {
		expect(await draw('organ-three-stave')).toMatchScreenshot(
			'engraving_organ-three-stave.png',
		);
	});

	it.concurrent('organ-three-stave-layout (pp. 342–343): braces manual staves with joined barlines, excludes pedal stave with separate barlines, and spans systemic left line', async () => {
		const e = await engrave('organ-three-stave', 'organ-three-stave-layout');
		const m1 = e.measureRect(0);
		const m1s1 = e.lines(0, 0, 1);
		const m1s2 = e.lines(0, 0, 2);
		const ped = e.lines(0, 1, 1);
		const space = e.space(0, 0);
		const manTop = must(m1s1[0], 'Manual staff 1 top');
		const manBot = must(m1s2[m1s2.length - 1], 'Manual staff 2 bottom');
		const pedTop = must(ped[0], 'Pedal staff top');
		const pedBot = must(ped[ped.length - 1], 'Pedal staff bottom');

		const connectors = e.of('staveconnector');
		const leftOfM1 = connectors.filter(
			(c) => rightEdge(c.box) <= m1.x + 2.5 * space,
		);
		const hasManualBraceOnly = leftOfM1.some(
			(c) =>
				c.box.w >= 0.4 * space &&
				Math.abs(c.box.y - manTop) <= space &&
				Math.abs(bottomEdge(c.box) - manBot) <= space,
		);
		const hasSystemicLeft = leftOfM1.some(
			(c) =>
				Math.abs(c.box.y - manTop) <= space &&
				Math.abs(bottomEdge(c.box) - pedBot) <= space,
		);
		const barX = rightEdge(m1);
		const gapMidY = (manBot + pedTop) / 2;
		const barCrossesToPedal = connectors.some(
			(c) =>
				c.box.x <= barX + space &&
				rightEdge(c.box) >= barX - space &&
				c.box.y < gapMidY &&
				bottomEdge(c.box) > gapMidY,
		);
		for (const c of connectors) {
			markBox(e, c.box, 'Connector');
		}
		expect(
			e.check([hasManualBraceOnly, hasSystemicLeft, !barCrossesToPedal]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('draws organ-single-manual', async () => {
		expect(await draw('organ-single-manual')).toMatchScreenshot(
			'engraving_organ-single-manual.png',
		);
	});

	it.concurrent('organ-single-manual-brace (p. 343): draws a compressed curly brace on a single-stave manual and leaves the pedal stave unbraced', async () => {
		const e = await engrave('organ-single-manual', 'organ-single-manual-brace');
		const m1 = e.measureRect(0);
		const manLines = e.lines(0, 0, 1);
		const pedLines = e.lines(0, 1, 1);
		const space = e.space(0, 0);
		const manTop = must(manLines[0], 'Manual staff top');
		const manBot = must(manLines[manLines.length - 1], 'Manual staff bottom');
		const pedTop = must(pedLines[0], 'Pedal staff top');
		const pedBot = must(pedLines[pedLines.length - 1], 'Pedal staff bottom');

		const connectors = e.of('staveconnector');
		const leftOfM1 = connectors.filter(
			(c) => rightEdge(c.box) <= m1.x + 2.5 * space,
		);
		const hasSingleManualBrace = leftOfM1.some(
			(c) =>
				c.box.w >= 0.4 * space &&
				Math.abs(c.box.y - manTop) <= space &&
				Math.abs(bottomEdge(c.box) - manBot) <= space,
		);
		const pedalUnbraced = !leftOfM1.some(
			(c) => c.box.w >= 0.4 * space && bottomEdge(c.box) >= pedTop - space,
		);
		const hasSystemicLeft = leftOfM1.some(
			(c) =>
				Math.abs(c.box.y - manTop) <= space &&
				Math.abs(bottomEdge(c.box) - pedBot) <= space,
		);
		for (const c of connectors) {
			markBox(e, c.box, 'Connector');
		}
		expect(
			e.check([hasSingleManualBrace, pedalUnbraced, hasSystemicLeft]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('draws organ-pedal-markings', async () => {
		expect(await draw('organ-pedal-markings')).toMatchScreenshot(
			'engraving_organ-pedal-markings.png',
		);
	});

	it.concurrent('organ-pedal-heel-toe-placement (pp. 347–348): places right-foot marks above and left-foot marks below the stave without inverting symbols', async () => {
		const e = await engrave(
			'organ-pedal-markings',
			'organ-pedal-heel-toe-placement',
		);
		const m1Lines = e.lines(0);
		const m2Lines = e.lines(1);
		const space = e.space(0);
		const m1Top = must(m1Lines[0], 'M1 top line');
		const m2Top = must(m2Lines[0], 'M2 top line');
		const m2Bot = must(m2Lines[m2Lines.length - 1], 'M2 bottom line');
		const m1Notes = e
			.inMeasure('notehead', 0)
			.sort((a, b) => a.box.x - b.box.x);
		const m2Notes = e
			.inMeasure('notehead', 1)
			.sort((a, b) => a.box.x - b.box.x);
		for (const n of [...m1Notes, ...m2Notes]) {
			markBox(e, n.box, 'Pedal note + mark');
		}
		// Right-foot marks sit clearly above M1's stave; left-foot marks sit clearly below M2's stave.
		const allM1Above =
			m1Notes.length === 4 &&
			m1Notes.every((n) => n.box.y < m1Top - 1.5 * space);
		const allM2Below =
			m2Notes.length === 4 &&
			m2Notes.every(
				(n) =>
					bottomEdge(n.box) > m2Bot + 2.5 * space && n.box.y >= m2Top - space,
			);
		expect(e.check([allM1Above, allM2Below])).toMatchMeasurements([true, true]);
	});
});
