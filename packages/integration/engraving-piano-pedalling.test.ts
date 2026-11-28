import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { bottomEdge, rightEdge } from './engraving-spanners';

describe('Behind Bars piano pedalling', () => {
	it.concurrent('draws piano-pedalling', async () => {
		expect(await draw('piano-pedalling')).toMatchScreenshot(
			'engraving_piano-pedalling.png',
		);
	});

	it.concurrent('pedal-below-lowest-stave (p. 332): places the pedal indication beneath the lowest stave and below the 8vb bracket', async () => {
		const e = await engrave('piano-pedalling', 'pedal-below-lowest-stave');
		const m1 = e.measureRect(0);
		const space = e.space(0, 0);
		const staff2Bottom = must(
			e.lines(0, 0, 2).at(-1),
			'M1 staff 2 bottom line',
		);
		const bracket = must(
			e
				.of('bracket')
				.find(
					(b) =>
						b.box.x >= m1.x - space &&
						rightEdge(b.box) <= rightEdge(m1) + space,
				),
			'M1 8vb bracket',
		);
		const pedal = must(
			e
				.of('pedal')
				.find(
					(p) =>
						p.box.x >= m1.x - space &&
						rightEdge(p.box) <= rightEdge(m1) + space,
				),
			'M1 pedal',
		);
		markBox(e, bracket.box, '8vb bracket');
		markBox(e, pedal.box, 'Pedal');
		expect(
			e.check([
				bracket.box.y >= staff2Bottom,
				pedal.box.y >= bottomEdge(bracket.box) + 0.25 * space,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.todo('pedal-simultaneous-order (pp. 332–333): stacks simultaneous pedals');

	it.concurrent('pedal-align-struck-note (pp. 333, 335): aligns each pedal start beneath its struck notehead', async () => {
		const e = await engrave('piano-pedalling', 'pedal-align-struck-note');
		const m3 = e.measureRect(2);
		const space = e.space(2, 0);
		const s2Notes = e
			.headsIn(2, { voice: '2' })
			.sort((a, b) => a.head.x - b.head.x);
		const beat1 = must(s2Notes[0], 'M3 beat 1 note');
		const beat3 = must(s2Notes[2], 'M3 beat 3 note');
		const pedals = e
			.of('pedal')
			.filter(
				(p) =>
					p.box.x >= m3.x - space && rightEdge(p.box) <= rightEdge(m3) + space,
			)
			.sort((a, b) => a.box.x - b.box.x);
		const p1 = must(pedals[0], 'M3 first pedal');
		const p2 = must(pedals[1], 'M3 second pedal');
		markBox(e, p1.box, 'Pedal 1');
		markBox(e, p2.box, 'Pedal 2');
		expect(
			e.check([
				Math.abs(p1.box.x - beat1.head.x) <= 0.75 * space,
				Math.abs(p2.box.x - beat3.head.x) <= 0.75 * space,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('pedal-extension-line-solid-hook (p. 334): draws pedal extension lines as solid horizontal lines with an upward release hook', async () => {
		const e = await engrave(
			'piano-pedalling',
			'pedal-extension-line-solid-hook',
		);
		const m3 = e.measureRect(2);
		const space = e.space(2, 0);
		const pedals = e
			.of('pedal')
			.filter(
				(p) =>
					p.box.x >= m3.x - space && rightEdge(p.box) <= rightEdge(m3) + space,
			)
			.sort((a, b) => a.box.x - b.box.x);
		const p1 = must(pedals[0], 'M3 first pedal');
		markBox(e, p1.box, 'Pedal 1');
		// Check vertical release hook at right end of pedal line.
		const endX = Math.floor(rightEdge(p1.box)) - 1;
		const endBands = p1.bandsAt(endX);
		const endHeight =
			endBands.length === 0
				? 0
				: Math.max(...endBands.map(([, b]) => b)) -
					Math.min(...endBands.map(([t]) => t));
		const hasUpwardHook = endHeight >= 0.5 * space;
		// Check solid horizontal line across the long uninterrupted extension in M5.
		const m5 = e.measureRect(4);
		const m45Pedal = must(
			e.of('pedal').find((p) => p.box.x < m5.x && rightEdge(p.box) > m5.x),
			'M4-M5 pedal',
		);
		const midStart = Math.round(m5.x + 2 * space);
		const midEnd = Math.round(rightEdge(m5) - 2 * space);
		let solidColumns = 0;
		for (let x = midStart; x <= midEnd; x++) {
			if (m45Pedal.bandsAt(x).length > 0) {
				solidColumns++;
			}
		}
		const isSolid = solidColumns / Math.max(1, midEnd - midStart + 1) >= 0.9;
		expect(e.check([isSolid, hasUpwardHook])).toMatchMeasurements([true, true]);
	});

	it.concurrent('pedal-retake-notch-barline (pp. 335–336): draws retake notches under the new attacks and aligns the final release hook at the barline', async () => {
		const e = await engrave('piano-pedalling', 'pedal-retake-notch-barline');
		const m4 = e.measureRect(3);
		const m5 = e.measureRect(4);
		const space = e.space(3, 0);
		const pedal = must(
			e
				.of('pedal')
				.find((p) => p.box.x < rightEdge(m4) && rightEdge(p.box) > m5.x),
			'M4-M5 spanning pedal',
		);
		markBox(e, pedal.box, 'M4-M5 pedal');
		const m4Beat3 = must(
			e.headsIn(3, { voice: '2' }).sort((a, b) => a.head.x - b.head.x)[2],
			'M4 beat 3 note',
		);
		const m5Beat1 = must(
			e.headsIn(4, { voice: '2' }).sort((a, b) => a.head.x - b.head.x)[0],
			'M5 beat 1 note',
		);
		const hasNotchNear = (targetX: number) => {
			let maxRise = 0;
			const baseY = bottomEdge(pedal.box);
			for (
				let x = Math.floor(targetX - space);
				x <= Math.ceil(targetX + space);
				x++
			) {
				for (const [top] of pedal.bandsAt(x)) {
					maxRise = Math.max(maxRise, baseY - top);
				}
			}
			return maxRise >= 0.5 * space;
		};
		const endNearBarline =
			Math.abs(rightEdge(pedal.box) - rightEdge(m5)) <= 1.0 * space;
		expect(
			e.check([
				hasNotchNear(m4Beat3.head.x),
				hasNotchNear(m5Beat1.head.x),
				endNearBarline,
			]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('pedal-system-break-confirm (pp. 332–333): keeps the pedal line open at the system end and confirms (Ped.) on the new system', async () => {
		const e = await engrave('piano-pedalling', 'pedal-system-break-confirm');
		const m6 = e.measureRect(5);
		const m7 = e.measureRect(6);
		const space = e.space(5, 0);
		const m6Pedal = must(
			e
				.of('pedal')
				.find(
					(p) =>
						p.box.x >= m6.x - space &&
						rightEdge(p.box) <= rightEdge(m6) + space &&
						p.box.y < m7.y,
				),
			'M6 open pedal',
		);
		const m7Pedal = must(
			e
				.of('pedal')
				.find(
					(p) =>
						p.box.x >= m7.x - space &&
						rightEdge(p.box) <= rightEdge(m7) + space &&
						p.box.y >= m7.y,
				),
			'M7 continuation pedal',
		);
		markBox(e, m6Pedal.box, 'M6 open pedal');
		markBox(e, m7Pedal.box, 'M7 (Ped.) continuation');
		const bandHeightAt = (pedal: typeof m6Pedal, x: number) => {
			const bands = pedal.bandsAt(x);
			if (bands.length === 0) {
				return 0;
			}
			return (
				Math.max(...bands.map(([, b]) => b)) -
				Math.min(...bands.map(([t]) => t))
			);
		};
		const m6ReachesBarline =
			Math.abs(rightEdge(m6Pedal.box) - rightEdge(m6)) <= 0.5 * space;
		const m6OpenAtEnd =
			bandHeightAt(m6Pedal, Math.floor(rightEdge(m6Pedal.box)) - 1) <
			0.5 * space;
		const m7HasLabel = m7Pedal.box.h >= 1.2 * space;
		const m7HasReleaseHook =
			bandHeightAt(m7Pedal, Math.floor(rightEdge(m7Pedal.box)) - 1) >=
			0.5 * space;
		expect(
			e.check([m6ReachesBarline, m6OpenAtEnd, m7HasLabel, m7HasReleaseHook]),
		).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('pedal-sostenuto-label (p. 336): labels the sostenuto pedal Sost. Ped. with an extension line', async () => {
		const e = await engrave('piano-pedalling', 'pedal-sostenuto-label');
		const m2 = e.measureRect(1);
		const pedals = e
			.of('pedal')
			.filter((p) => {
				const cx = p.box.x + p.box.w / 2;
				return cx >= m2.x && cx <= rightEdge(m2);
			})
			.sort((a, b) => a.box.y - b.box.y);
		const sost = pedals[1] ?? pedals[0];
		if (sost) {
			markBox(e, sost.box, 'Sost. Ped.');
		}
		const hasSostSpan = Boolean(sost && sost.box.w >= 0.6 * m2.w);
		expect(e.check([pedals.length >= 2, hasSostSpan])).toMatchMeasurements([
			true,
			true,
		]);
	});
});
