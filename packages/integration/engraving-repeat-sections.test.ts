import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { bottomEdge, rightEdge } from './engraving-spanners';

describe('Behind Bars repeated sections, voltas, and navigation signs', () => {
	it.concurrent('draws repeat barlines, signature order, voltas, and segno/coda', async () => {
		expect(await draw('repeat-sections')).toMatchScreenshot(
			'engraving_repeat-sections.png',
		);
	});

	it.concurrent('repeat-barline-back-to-back (p. 234): draws back-to-back repeat barlines with dots on both sides', async () => {
		const e = await engrave('repeat-sections', 'repeat-barline-back-to-back');
		const m2 = e.measureRect(1);
		const m3 = e.measureRect(2);
		const lines = e.lines(1);
		const topLine = must(lines[0], 'top stave line');
		const bottomLine = must(lines[lines.length - 1], 'bottom stave line');
		const space = e.space(1);
		const boundary = (rightEdge(m2) + m3.x) / 2;
		const near = e
			.of('stavebarline')
			.filter(
				(m) =>
					rightEdge(m.box) >= boundary - 2 * space &&
					m.box.x <= boundary + 2 * space &&
					m.box.y <= bottomLine &&
					bottomEdge(m.box) >= topLine,
			);
		const hasLeftSide = near.some((m) => m.box.x < boundary - 0.5 * space);
		const hasRightSide = near.some(
			(m) => rightEdge(m.box) > boundary + 0.5 * space,
		);
		for (const m of near) {
			markBox(e, m.box, 'Repeat barline');
		}
		expect(e.check([hasLeftSide, hasRightSide])).toMatchMeasurements([
			true,
			true,
		]);
	});

	it.concurrent('repeat-barline-signature-order (pp. 234–235): places new signatures before a forward repeat and after a backward repeat', async () => {
		const e = await engrave(
			'repeat-sections',
			'repeat-barline-signature-order',
		);
		const m5Note = must(e.inMeasure('notehead', 4)[0], 'M5 notehead');
		const m5Key = must(e.inMeasure('keysignature', 4)[0], 'M5 key signature');
		const m5Time = must(
			e.inMeasure('timesignature', 4)[0],
			'M5 time signature',
		);
		const m5Bars = e.inMeasure('stavebarline', 4);
		const space = e.space(4);
		const m5Fwd = must(
			m5Bars.find((b) => b.box.w > space && rightEdge(b.box) < m5Note.box.x),
			'M5 forward repeat barline',
		);
		const m5Bwd = must(
			m5Bars.find((b) => b.box.w > space && b.box.x > rightEdge(m5Note.box)),
			'M5 backward repeat barline',
		);
		const m5Clefs = e.inMeasure('clef', 4);
		const m6Note = must(e.inMeasure('notehead', 5)[0], 'M6 notehead');
		const m6Clef = must(
			e.inMeasure('clef', 5).find((c) => rightEdge(c.box) < m6Note.box.x),
			'M6 post-repeat bass clef',
		);
		const m6Key = must(
			e.inMeasure('keysignature', 5)[0],
			'M6 key cancellation',
		);
		const m6Time = must(
			e.inMeasure('timesignature', 5)[0],
			'M6 time signature',
		);

		markBox(e, m5Key.box, 'M5 key');
		markBox(e, m5Time.box, 'M5 time');
		markBox(e, m5Fwd.box, 'M5 forward repeat');
		markBox(e, m5Bwd.box, 'M5 backward repeat');
		markBox(e, m6Clef.box, 'M6 bass clef');
		markBox(e, m6Key.box, 'M6 key cancel');
		markBox(e, m6Time.box, 'M6 time');

		expect(
			e.check([
				rightEdge(m5Key.box) < m5Time.box.x,
				rightEdge(m5Time.box) + space < rightEdge(m5Fwd.box),
				rightEdge(m5Fwd.box) < m5Note.box.x,
				m5Bwd.box.x - rightEdge(m5Note.box) >= 1.5 * space,
				m5Clefs.length === 0,
				m6Clef.box.x > rightEdge(m5Bwd.box),
				rightEdge(m6Clef.box) < m6Key.box.x,
				rightEdge(m6Key.box) < m6Time.box.x,
				rightEdge(m6Time.box) < m6Note.box.x,
			]),
		).toMatchMeasurements([
			true,
			true,
			true,
			true,
			true,
			true,
			true,
			true,
			true,
		]);
	});

	it.concurrent('volta-bracket-placement (p. 236): places first- and second-time brackets above the stave', async () => {
		const e = await engrave('repeat-sections', 'volta-bracket-placement');
		const ok = [7, 8].map((idx) => {
			const rect = e.measureRect(idx);
			const topLine = must(e.lines(idx)[0], `top line m${idx + 1}`);
			const volta = must(e.inMeasure('volta', idx)[0], `volta m${idx + 1}`);
			markBox(e, volta.box, `Volta m${idx + 1}`);
			const aboveStave = bottomEdge(volta.box) < topLine;
			const wideEnough = volta.box.w >= 0.7 * rect.w;
			return aboveStave && wideEnough;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true]);
	});

	it.concurrent('volta-open-closed-ends (p. 237): keeps brackets open across system breaks and continuing finals, closed at repeats and final barline', async () => {
		const e = await engrave('repeat-sections', 'volta-open-closed-ends');
		const space = e.space(11);
		const hasHook = (idx: number, side: 'left' | 'right') => {
			const volta = must(e.inMeasure('volta', idx)[0], `volta m${idx + 1}`);
			markBox(e, volta.box, `Volta m${idx + 1}`);
			const xs =
				side === 'left'
					? [Math.floor(volta.box.x), Math.floor(volta.box.x) + 1]
					: [
							Math.ceil(rightEdge(volta.box)) - 1,
							Math.ceil(rightEdge(volta.box)) - 2,
						];
			const maxSpan = Math.max(
				...xs.map((x) => {
					const bands = volta.bandsAt(x);
					return bands.length === 0
						? 0
						: Math.max(...bands.map(([, b]) => b)) -
								Math.min(...bands.map(([t]) => t));
				}),
			);
			return maxSpan >= 0.8 * space;
		};
		// M12 (idx 11): open-ended at system break (left hook, no right hook)
		// M13 (idx 12): continues open on left, closed at repeat barline on right
		// M14 (idx 13): continuing 2nd ending (left hook, open right)
		// M19 (idx 18): piece-final 2nd ending (left hook, closed right)
		const checks = [
			hasHook(11, 'left'),
			!hasHook(11, 'right'),
			!hasHook(12, 'left'),
			hasHook(12, 'right'),
			hasHook(13, 'left'),
			!hasHook(13, 'right'),
			hasHook(18, 'left'),
			hasHook(18, 'right'),
		];
		expect(e.check(checks)).toMatchMeasurements([
			true,
			true,
			true,
			true,
			true,
			true,
			true,
			true,
		]);
	});

	it.concurrent('segno-coda-sign-position (p. 240): places segno and coda signs above the stave centred over the barline', async () => {
		const e = await engrave('repeat-sections', 'segno-coda-sign-position');
		const words = e.of('words');
		const checks = [
			{ idx: 15, label: 'Segno m16' },
			{ idx: 16, label: 'Coda m17' },
		].flatMap(({ idx, label }) => {
			const rect = e.measureRect(idx);
			const topLine = must(e.lines(idx)[0], `top line m${idx + 1}`);
			const space = e.space(idx);
			const sign = must(
				words.find((m) => {
					const cx = m.box.x + m.box.w / 2;
					return (
						Math.abs(cx - rect.x) <= 2 * space &&
						bottomEdge(m.box) < topLine &&
						m.box.y > topLine - 6 * space
					);
				}),
				label,
			);
			markBox(e, sign.box, label);
			const center = sign.box.x + sign.box.w / 2;
			const aboveStave = bottomEdge(sign.box) < topLine;
			const centeredOnBarline = Math.abs(center - rect.x) <= 0.25 * space;
			return [aboveStave, centeredOnBarline];
		});
		expect(e.check(checks)).toMatchMeasurements([true, true, true, true]);
	});
});
