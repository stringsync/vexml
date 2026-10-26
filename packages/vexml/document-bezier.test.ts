import { describe, expect, it } from 'bun:test';
import { MElement, type Slur } from '@stringsync/mdom';
import { CanvasContext, StaveNote } from 'vexflow/core';
import { CrispCurve } from './crisp-curve';
import { DashedTie } from './dashed-tie';
import { DefaultScoreParser } from './default-score-parser';
import { FakePaintProbe } from './fake-paint-probe';
import { PaintContext } from './paint-context';
import { PaintList } from './paint-list';
import { bezierPointOf, curveSegmentOf } from './score-reader';

function recording() {
	const list = new PaintList();
	const canvas = new PaintContext(list, new FakePaintProbe(), null);
	return {
		list,
		context: new CanvasContext(canvas as unknown as CanvasRenderingContext2D),
	};
}

const controls = { start: { x: 12, y: 30 }, end: { x: -24, y: -10 } };

describe('document Bézier controls', () => {
	it('reads finite axes, preserves zero, and only uses x2/y2 for outgoing continuations', () => {
		const mark = new MElement('slur');
		mark.setAttribute('type', 'continue');
		mark.setAttribute('bezier-x', '0');
		mark.setAttribute('bezier-y', '-12');
		mark.setAttribute('bezier-x2', '18');
		mark.setAttribute('bezier-y2', 'NaN');
		expect(bezierPointOf(mark)).toEqual({ x: 0, y: -12 });
		expect(bezierPointOf(mark, true)).toEqual({ x: 18, y: null });
		mark.setAttribute('type', 'start');
		expect(bezierPointOf(mark, true)).toEqual({ x: 0, y: -12 });
	});

	it('pairs adjacent segments and separates a continuation’s incoming and outgoing controls', async () => {
		const notes = [
			'<slur type="start" bezier-x="10" bezier-y="20"/>',
			'<slur type="continue" bezier-x="-15" bezier-y="30" bezier-x2="25" bezier-y2="40"/>',
			'<slur type="stop" bezier-x="-35" bezier-y="50"/>',
		]
			.map(
				(mark) =>
					`<note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type><notations>${mark}</notations></note>`,
			)
			.join('');
		const doc = await new DefaultScoreParser().parse(
			`<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes>${notes}</measure></part></score-partwise>`,
		);
		const marks =
			doc.score.parts[0]?.measures[0]?.notes.flatMap((n) => n.slurs) ?? [];
		expect(marks).toHaveLength(3);
		const [start, continuation] = marks as [Slur, Slur, Slur];
		expect(curveSegmentOf(start)?.end).toBe(marks[1]);
		expect(curveSegmentOf(start)?.bezier).toEqual({
			start: { x: 10, y: 20 },
			end: { x: -15, y: 30 },
		});
		expect(curveSegmentOf(continuation)?.bezier).toEqual({
			start: { x: 25, y: 40 },
			end: { x: -35, y: 50 },
		});
	});

	it('keeps paired endpoints when same-number slurs overlap in separate voices', async () => {
		const marks = [
			['start', 1],
			['start', 2],
			['stop', 2],
			['stop', 1],
		]
			.map(
				([type, voice]) =>
					`<note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>${voice}</voice><type>quarter</type><notations><slur number="1" type="${type}"/></notations></note>`,
			)
			.join('');
		const doc = await new DefaultScoreParser().parse(
			`<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions></attributes>${marks}</measure></part></score-partwise>`,
		);
		const slurs =
			doc.score.parts[0]?.measures[0]?.notes.flatMap((n) => n.slurs) ?? [];
		expect(slurs).toHaveLength(4);
		const [outer, inner] = slurs as [Slur, Slur, Slur, Slur];
		expect(curveSegmentOf(outer)?.end).toBe(slurs[3]);
		expect(curveSegmentOf(inner)?.end).toBe(slurs[2]);
	});

	for (const direction of [-1, 1]) {
		it(`draws absolute endpoint offsets regardless of bow direction ${direction}`, () => {
			const { list, context } = recording();
			const curve = new CrispCurve(
				new StaveNote({ keys: ['c/5'], duration: 'q' }),
				undefined,
				{ xShift: 0, yShift: 0, bezier: controls },
			);
			curve.setContext(context);
			const cps = curve.renderOptions.cps;
			curve.renderCurve({
				firstX: 10,
				lastX: 110,
				firstY: 100,
				lastY: 120,
				direction,
			});
			expect(
				list.ops[0]?.path?.find((s) => s.kind === 'bezierCurveTo')?.args,
			).toEqual([22, 70, 86, 130, 110, 120]);
			expect(curve.renderOptions.cps).toBe(cps);
		});
	}

	it('retains the automatic axis when a document supplies only one coordinate', () => {
		const { list, context } = recording();
		const curve = new CrispCurve(
			new StaveNote({ keys: ['c/5'], duration: 'q' }),
			undefined,
			{
				xShift: 0,
				yShift: 0,
				cps: [
					{ x: 0, y: 15 },
					{ x: 0, y: 15 },
				],
				bezier: { start: { x: null, y: 0 }, end: { x: null, y: null } },
			},
		);
		curve.setContext(context).renderCurve({
			firstX: 10,
			lastX: 110,
			firstY: 100,
			lastY: 100,
			direction: -1,
		});
		expect(
			list.ops[0]?.path?.find((s) => s.kind === 'bezierCurveTo')?.args,
		).toEqual([35, 100, 85, 85, 110, 100]);
	});

	for (const dash of [null, [4, 3]]) {
		it(`draws a ${dash ? 'dashed' : 'solid'} tie as a cubic and reports its control hull`, () => {
			const { list, context } = recording();
			const note = new StaveNote({ keys: ['c/5'], duration: 'q' });
			const tie = new DashedTie(
				{
					firstNote: note,
					lastNote: note,
					firstIndexes: [0],
					lastIndexes: [0],
				},
				dash,
				null,
				controls,
			);
			tie.renderOptions.firstXShift = 0;
			tie.renderOptions.lastXShift = 0;
			tie.renderOptions.yShift = 0;
			tie.setContext(context).renderTie({
				firstX: 10,
				lastX: 110,
				firstYs: [100],
				lastYs: [100],
				direction: -1,
			});
			expect(
				list.ops[0]?.path?.find((s) => s.kind === 'bezierCurveTo')?.args,
			).toEqual([22, 70, 86, 110, 110, 100]);
			expect(tie.inkBounds?.top).toBeLessThanOrEqual(70);
			expect(tie.inkBounds?.bottom).toBeGreaterThanOrEqual(110);
			expect(list.ops[0]?.call.kind).toBe(dash ? 'stroke' : 'fill');
		});
	}
});
