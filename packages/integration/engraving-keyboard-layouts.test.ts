import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { bottomEdge, rightEdge } from './engraving-spanners';

describe('Behind Bars keyboard layouts (two pianos and multi-stave solo piano)', () => {
	it.concurrent('draws keyboard-two-piano', async () => {
		expect(await draw('keyboard-two-piano')).toMatchScreenshot(
			'engraving_keyboard-two-piano.png',
		);
	});

	it.concurrent('keyboard-two-piano-score-layout (pp. 330–331): braces each piano pair separately with broken barlines between pianos and a systemic left line', async () => {
		const e = await engrave(
			'keyboard-two-piano',
			'keyboard-two-piano-score-layout',
		);
		const m1 = e.measureRect(0);
		const p1s1 = e.lines(0, 0, 1);
		const p1s2 = e.lines(0, 0, 2);
		const p2s1 = e.lines(0, 1, 1);
		const p2s2 = e.lines(0, 1, 2);
		const space = e.space(0, 0);
		const p1Top = must(p1s1[0], 'P1 staff 1 top');
		const p1Bot = must(p1s2[p1s2.length - 1], 'P1 staff 2 bottom');
		const p2Top = must(p2s1[0], 'P2 staff 1 top');
		const p2Bot = must(p2s2[p2s2.length - 1], 'P2 staff 2 bottom');

		const connectors = e.of('staveconnector');
		const leftOfM1 = connectors.filter(
			(c) => rightEdge(c.box) <= m1.x + 2.5 * space,
		);
		// Two separate braces (one spanning P1, one spanning P2), plus systemic left barline spanning P1..P2.
		const hasP1Brace = leftOfM1.some(
			(c) =>
				c.box.w >= 0.4 * space &&
				Math.abs(c.box.y - p1Top) <= space &&
				Math.abs(bottomEdge(c.box) - p1Bot) <= space,
		);
		const hasP2Brace = leftOfM1.some(
			(c) =>
				c.box.w >= 0.4 * space &&
				Math.abs(c.box.y - p2Top) <= space &&
				Math.abs(bottomEdge(c.box) - p2Bot) <= space,
		);
		const hasSystemicLeft = leftOfM1.some(
			(c) =>
				Math.abs(c.box.y - p1Top) <= space &&
				Math.abs(bottomEdge(c.box) - p2Bot) <= space,
		);
		// Check internal barline at end of measure 1: should NOT cross the gap between P1 staff 2 and P2 staff 1.
		const barX = rightEdge(m1);
		const gapMidY = (p1Bot + p2Top) / 2;
		const barCrossesGap = connectors.some(
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
			e.check([hasP1Brace, hasP2Brace, hasSystemicLeft, !barCrossesGap]),
		).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('draws keyboard-three-stave', async () => {
		expect(await draw('keyboard-three-stave')).toMatchScreenshot(
			'engraving_keyboard-three-stave.png',
		);
	});

	it.concurrent('keyboard-solo-multi-stave-brace (pp. 331–332): joins all three solo piano staves with one curly brace and continuous barlines', async () => {
		const e = await engrave(
			'keyboard-three-stave',
			'keyboard-solo-multi-stave-brace',
		);
		const m1 = e.measureRect(0);
		const s1 = e.lines(0, 0, 1);
		const s3 = e.lines(0, 0, 3);
		const space = e.space(0, 0);
		const top = must(s1[0], 'staff 1 top');
		const bot = must(s3[s3.length - 1], 'staff 3 bottom');

		const connectors = e.of('staveconnector');
		const hasFullBrace = connectors.some(
			(c) =>
				rightEdge(c.box) <= m1.x + 2.5 * space &&
				c.box.w >= 0.5 * space &&
				Math.abs(c.box.y - top) <= space &&
				Math.abs(bottomEdge(c.box) - bot) <= space,
		);
		const barX = rightEdge(m1);
		const hasContinuousBar = connectors.some(
			(c) =>
				c.box.x <= barX + space &&
				rightEdge(c.box) >= barX - space &&
				Math.abs(c.box.y - top) <= space &&
				Math.abs(bottomEdge(c.box) - bot) <= space,
		);
		for (const c of connectors) {
			markBox(e, c.box, 'Connector');
		}
		expect(e.check([hasFullBrace, hasContinuousBar])).toMatchMeasurements([
			true,
			true,
		]);
	});
});
