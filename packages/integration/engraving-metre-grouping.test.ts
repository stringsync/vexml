import { describe, expect, it } from 'bun:test';
import type { Box, Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';

describe('Behind Bars metre and rhythmic grouping (pp. 164–177)', () => {
	it.concurrent('draws beams extended across rests with stemlets', async () => {
		expect(await draw('metre-stemlets')).toMatchScreenshot(
			'engraving_metre-stemlets.png',
		);
	});

	it.concurrent('draws interchangeable dual time signatures', async () => {
		expect(await draw('metre-dual-time')).toMatchScreenshot(
			'engraving_metre-dual-time.png',
		);
	});

	it.concurrent('draws concurrent metres, polymetre alignment and non-coinciding barlines', async () => {
		expect(await draw('metre-polymetre')).toMatchScreenshot(
			'engraving_metre-polymetre.png',
		);
	});

	it.concurrent('beam-rest-stemlets (p. 165): stemlets under extended beam', async () => {
		const e = await engrave('metre-stemlets', 'beam-rest-stemlets');
		const checkRestStemlet = (
			m: number,
			restIndex: number,
			label: string,
		): boolean => {
			const sp = e.space(m);
			const rest = must(e.restsIn(m)[restIndex], `${label} rest`);
			const stems = e.inMeasure('stem', m);
			const beams = e.inMeasure('beam', m);
			const stemlet = stems.find((s) => {
				const cx = s.box.x + s.box.w / 2;
				return (
					cx >= rest.head.x - 0.5 * sp &&
					cx <= rest.head.x + rest.head.w + 0.5 * sp
				);
			});
			markBox(e, rest.head, `${label} rest`);
			if (!stemlet) {
				return false;
			}
			markBox(e, stemlet.box, `${label} stemlet`);
			const beam = beams.find((b) => {
				const cx = stemlet.box.x + stemlet.box.w / 2;
				return cx >= b.box.x - 0.3 * sp && cx <= b.box.x + b.box.w + 0.3 * sp;
			});
			if (!beam) {
				return false;
			}
			const meetsBeam =
				stemlet.box.y <= beam.box.y + beam.box.h + 0.2 * sp &&
				stemlet.box.y + stemlet.box.h >= beam.box.y - 0.2 * sp;
			const stopsShort = stemlet.box.y + stemlet.box.h < rest.head.y;
			const shortStemlet =
				stemlet.box.h >= 0.5 * sp && stemlet.box.h <= 2.5 * sp;
			return meetsBeam && stopsShort && shortStemlet;
		};

		const m1Opening = checkRestStemlet(0, 0, 'M1 opening');
		const m1Closing = checkRestStemlet(0, 1, 'M1 closing');
		const m2Middle = checkRestStemlet(1, 0, 'M2 middle');
		const m2Closing = checkRestStemlet(1, 1, 'M2 closing');

		// In M2, both primary and inner 16th beams span through the closing rest stemlet.
		const sp2 = e.space(1);
		const m2Beam = unionBox(e.inMeasure('beam', 1), 'M2 beam');
		const m2ClosingRest = must(e.restsIn(1)[1], 'M2 closing rest');
		const m2QuarterRest = must(e.restsIn(1)[2], 'M2 quarter rest');
		const m2InnerBeamReaches =
			m2Beam.h >= 1.0 * sp2 && m2Beam.x + m2Beam.w >= m2ClosingRest.head.x;
		const m2QuarterHasNoStemlet = !e.inMeasure('stem', 1).some((s) => {
			const cx = s.box.x + s.box.w / 2;
			return (
				cx >= m2QuarterRest.head.x - 0.5 * sp2 &&
				cx <= m2QuarterRest.head.x + m2QuarterRest.head.w + 0.5 * sp2
			);
		});

		expect(
			e.check([
				m1Opening,
				m1Closing,
				m2Middle,
				m2Closing,
				m2InnerBeamReaches,
				m2QuarterHasNoStemlet,
			]),
		).toMatchMeasurements([true, true, true, true, true, true]);
	});

	it.concurrent('time-dual-interchangeable (p. 174): prints both signatures side by side with parentheses, slash and equals', async () => {
		const e = await engrave('metre-dual-time', 'time-dual-interchangeable');
		const results = [0, 1, 2].map((m) => {
			const time = unionBox(e.inMeasure('timesignature', m), `M${m + 1} time`);
			const sp = e.space(m);
			const notes = e.notes
				.filter((n) => n.measure === m && n.pitch !== null)
				.sort((a, b) => a.head.x - b.head.x);
			const firstNote = must(notes[0], `M${m + 1} first note`);
			markBox(e, time, `M${m + 1} dual time`);
			// A dual time signature (two stacked numerals plus relation glyph) is visibly wider than a single digit (~1.5sp)
			// and sits entirely left of the first notehead.
			return time.w >= 3.0 * sp && time.x + time.w < firstNote.head.x;
		});
		// M1 reads `2/4 (6/8)`: its inked columns fall into four runs (2/4, "(", 6/8, ")"), and the
		// 6/8 sits as far from the opening parenthesis as from the closing one.
		const m1 = must(e.inMeasure('timesignature', 0)[0], 'M1 time ink');
		const columns = [
			...new Set(
				m1
					.rowYs()
					.flatMap((y) =>
						m1
							.segmentsAt(y)
							.flatMap(([l, r]) =>
								Array.from({ length: r - l }, (_, k) => l + k),
							),
					),
			),
		].sort((a, b) => a - b);
		const runs: [number, number][] = [];
		for (const x of columns) {
			const last = runs[runs.length - 1];
			if (last && x - last[1] <= 2) {
				last[1] = x + 1;
			} else {
				runs.push([x, x + 1]);
			}
		}
		const [, open, inner, close] = runs;
		const centred =
			runs.length === 4 && open && inner && close
				? Math.abs(inner[0] - open[1] - (close[0] - inner[1])) <= 1
				: false;
		expect(e.check([...results, centred])).toMatchMeasurements([
			true,
			true,
			true,
			true,
		]);
	});

	it.concurrent('time-concurrent-barline-space (p. 173): allows space after the barline in all parts when one part changes metre', async () => {
		const e = await engrave('metre-polymetre', 'time-concurrent-barline-space');
		const results = [1, 2].map((m) => {
			const sp = e.space(m, 0);
			const p1Notes = partNotes(e, m, 0);
			const p2Notes = partNotes(e, m, 1);
			const p1First = must(p1Notes[0], `M${m + 1} P1 beat 1`);
			const p2First = must(p2Notes[0], `M${m + 1} P2 beat 1`);
			const time = unionBox(
				e.inMeasure('timesignature', m).filter((t) => t.box.x < p1First.head.x),
				`M${m + 1} P1 time`,
			);
			markBox(e, time, `M${m + 1} time`);
			markBox(e, p1First.head, `M${m + 1} P1 first`);
			markBox(e, p2First.head, `M${m + 1} P2 first`);
			const aligned = Math.abs(p1First.head.x - p2First.head.x) <= 0.6 * sp;
			const clearsTime = p2First.head.x > time.x + time.w;
			return aligned && clearsTime;
		});
		expect(e.check(results)).toMatchMeasurements([true, true]);
	});

	it.concurrent('polymetre-vertical-alignment (pp. 174–175): aligns equivalent beats vertically and spaces non-equivalent beats proportionally', async () => {
		const e = await engrave('metre-polymetre', 'polymetre-vertical-alignment');
		const sp = e.space(3, 0);
		const p1 = partNotes(e, 3, 0);
		const p2 = partNotes(e, 3, 1);
		const p1Beat1 = must(p1[0], 'M4 P1 beat 1');
		const p1Beat2 = must(p1[1], 'M4 P1 beat 2');
		const p1Beat3 = must(p1[2], 'M4 P1 beat 3');
		const p1Mid = must(p1[3], 'M4 P1 beat 4 (midpoint)');
		const p1Beat5 = must(p1[4], 'M4 P1 beat 5');
		const p1Beat6 = must(p1[5], 'M4 P1 beat 6');
		const p2Beat1 = must(p2[0], 'M4 P2 beat 1');
		const p2Beat2 = must(p2[1], 'M4 P2 beat 2');
		const p2Mid = must(p2[2], 'M4 P2 beat 3 (midpoint)');
		const p2Beat4 = must(p2[3], 'M4 P2 beat 4');
		markBox(e, p1Beat1.head, 'P1 beat 1');
		markBox(e, p2Beat1.head, 'P2 beat 1');
		markBox(e, p1Mid.head, 'P1 midpoint');
		markBox(e, p2Mid.head, 'P2 midpoint');
		markBox(e, p2Beat2.head, 'P2 beat 2');
		markBox(e, p2Beat4.head, 'P2 beat 4');
		const beat1Aligned = Math.abs(p1Beat1.head.x - p2Beat1.head.x) <= 0.25 * sp;
		const midAligned = Math.abs(p1Mid.head.x - p2Mid.head.x) <= 0.25 * sp;
		const beat2Between =
			p2Beat2.head.x > p1Beat2.head.x && p2Beat2.head.x < p1Beat3.head.x;
		const beat4Between =
			p2Beat4.head.x > p1Beat5.head.x && p2Beat4.head.x < p1Beat6.head.x;
		expect(
			e.check([beat1Aligned, midAligned, beat2Between, beat4Between]),
		).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('polymetre-non-coinciding-barline-align (p. 176): aligns simultaneous notes across staggered mid-measure barlines', async () => {
		const e = await engrave(
			'metre-polymetre',
			'polymetre-non-coinciding-barline-align',
		);
		const sp = e.space(4, 0);
		const p1 = partNotes(e, 4, 0);
		const p2 = partNotes(e, 4, 1);
		// Downbeat notes immediately following a mid-measure barline in either part
		// (0-based indices 3, 6, 9 for Part 1's 3/8 bars; 4, 8 for Part 2's 2/4 bars).
		const downbeats = [3, 4, 6, 8, 9];
		const results = downbeats.map((i) => {
			const n1 = must(p1[i], `M5 P1 note ${i + 1}`);
			const n2 = must(p2[i], `M5 P2 note ${i + 1}`);
			markBox(e, n1.head, `P1 #${i + 1}`);
			markBox(e, n2.head, `P2 #${i + 1}`);
			return Math.abs(n1.head.x - n2.head.x) <= 0.25 * sp;
		});
		const allAligned = p1.every((n1, i) => {
			const n2 = p2[i];
			return n2 !== undefined && Math.abs(n1.head.x - n2.head.x) <= 0.25 * sp;
		});
		expect(e.check([...results, allAligned])).toMatchMeasurements([
			true,
			true,
			true,
			true,
			true,
			true,
		]);
	});
});

function partNotes(e: Engraving, measure: number, part: number) {
	return e.notes
		.filter((n) => n.measure === measure && n.part === part && n.pitch !== null)
		.sort((a, b) => a.head.x - b.head.x);
}

function unionBox(inks: Ink[], label: string): Box {
	const first = must(inks[0], label);
	let left = first.box.x;
	let top = first.box.y;
	let right = first.box.x + first.box.w;
	let bottom = first.box.y + first.box.h;
	for (const ink of inks.slice(1)) {
		left = Math.min(left, ink.box.x);
		top = Math.min(top, ink.box.y);
		right = Math.max(right, ink.box.x + ink.box.w);
		bottom = Math.max(bottom, ink.box.y + ink.box.h);
	}
	return { x: left, y: top, w: right - left, h: bottom - top };
}
