import { describe, expect, it } from 'bun:test';
import type { Box, Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge, rightEdge } from './engraving-spanners';

interface TremoloGroup {
	strokes: Ink[];
	box: Box;
}

describe('Behind Bars single-note tremolos', () => {
	it.concurrent('draws single-note tremolos across durations, staves and chords', async () => {
		expect(await draw('tremolos')).toMatchScreenshot('engraving_tremolos.png');
	});

	it.concurrent('tremolo-tuplet-numeral (pp. 219–220): draws tuplet numeral on single-note tremolos', async () => {
		const e = await engrave('tremolos', 'tremolo-tuplet-numeral');
		const heads = e.headsIn(0);
		const tuplets = e.inMeasure('tuplet', 0).sort((a, b) => a.box.x - b.box.x);
		expect(tuplets).toHaveLength(2);
		const space = e.space(0);
		const ok = heads.map((note, idx) => {
			const numeral = must(tuplets[idx], `tuplet numeral ${idx + 1}`);
			const stem = must(note.stem, `stem ${idx + 1}`);
			markBox(e, numeral.box, `Numeral ${idx + 1}`);
			const centred =
				Math.abs(centre(numeral.box) - centre(stem.box)) <= 0.5 * space;
			const stemUp = stem.box.y < note.head.y;
			const atStemEnd = stemUp
				? bottomEdge(numeral.box) < stem.box.y
				: numeral.box.y > bottomEdge(stem.box);
			return centred && atStemEnd;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true]);
	});

	it.concurrent('tremolo-stroke-design (p. 221): centres tremolo strokes on the stem at roughly notehead width', async () => {
		const e = await engrave('tremolos', 'tremolo-stroke-design');
		const heads = e.headsIn(1);
		const tremolos = tremoloGroups(e, 1);
		expect(tremolos).toHaveLength(4);
		const space = e.space(1);
		const ok = heads.slice(2, 4).map((note, idx) => {
			const trem = must(tremolos[idx + 2], `tremolo ${idx + 3}`);
			const stem = must(note.stem, `stem ${idx + 3}`);
			markBox(e, trem.box, `Tremolo ${idx + 3}`);
			const centred =
				Math.abs(centre(trem.box) - centre(stem.box)) <= 0.25 * space;
			const widthOk =
				trem.box.w >= 0.7 * note.head.w && trem.box.w <= 1.5 * note.head.w;
			return centred && widthOk;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true]);
	});

	it.concurrent('tremolo-single-stroke-on-line (p. 221): intersects a line', async () => {
		const e = await engrave('tremolos', 'tremolo-single-stroke-on-line');
		const lines = e.lines(1);
		const tremolos = tremoloGroups(e, 1);
		expect(tremolos).toHaveLength(4);
		const ok = tremolos.slice(0, 2).map((trem, idx) => {
			markBox(e, trem.box, `Single stroke ${idx + 1}`);
			return lines.some(
				(line) => line >= trem.box.y && line <= bottomEdge(trem.box),
			);
		});
		expect(e.check(ok)).toMatchMeasurements([true, true]);
	});

	it.concurrent('tremolo-multi-stroke-head-clear (p. 221): clears notehead', async () => {
		const e = await engrave('tremolos', 'tremolo-multi-stroke-head-clear');
		const heads = e.headsIn(2);
		const tremolos = tremoloGroups(e, 2);
		expect(tremolos).toHaveLength(4);
		const space = e.space(2);
		const ok = heads.map((note, idx) => {
			const trem = must(tremolos[idx], `tremolo ${idx + 1}`);
			const stem = must(note.stem, `stem ${idx + 1}`);
			markBox(e, trem.box, `Tremolo ${idx + 1}`);
			const stemUp = stem.box.y < note.head.y;
			const gap = stemUp
				? note.head.y - bottomEdge(trem.box)
				: trem.box.y - bottomEdge(note.head);
			return gap >= 0.95 * space;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('tremolo-stem-extends-past (p. 222): extends past strokes', async () => {
		const e = await engrave('tremolos', 'tremolo-stem-extends-past');
		const heads = e.headsIn(2);
		const tremolos = tremoloGroups(e, 2);
		expect(tremolos).toHaveLength(4);
		const space = e.space(2);
		const ok = heads.map((note, idx) => {
			const trem = must(tremolos[idx], `tremolo ${idx + 1}`);
			const stem = must(note.stem, `stem ${idx + 1}`);
			markBox(e, trem.box, `Tremolo ${idx + 1}`);
			const stemUp = stem.box.y < note.head.y;
			const past = stemUp
				? trem.box.y - stem.box.y
				: bottomEdge(stem.box) - bottomEdge(trem.box);
			return past >= 0.25 * space;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('tremolo-clear-flag-beam (p. 222): clears flags and beams', async () => {
		const e = await engrave('tremolos', 'tremolo-clear-flag-beam');
		const heads = e.headsIn(3);
		const tremolos = tremoloGroups(e, 3);
		const beams = e.inMeasure('beam', 3);
		expect(heads).toHaveLength(7);
		expect(tremolos).toHaveLength(7);
		const ok = heads.map((note, idx) => {
			const trem = must(tremolos[idx], `tremolo ${idx + 1}`);
			const stem = must(note.stem, `stem ${idx + 1}`);
			markBox(e, trem.box, `Tremolo ${idx + 1}`);
			const stemUp = stem.box.y < note.head.y;
			if (idx < 3) {
				const flag = must(note.flag, `flag ${idx + 1}`);
				return stemUp
					? trem.box.y > bottomEdge(flag.box)
					: bottomEdge(trem.box) < flag.box.y;
			}
			const stemX = centre(stem.box);
			const beam = must(
				beams.find(
					(b) => stemX >= b.box.x - 2 && stemX <= rightEdge(b.box) + 2,
				),
				`beam ${idx + 1}`,
			);
			return stemUp
				? trem.box.y > bottomEdge(beam.box)
				: bottomEdge(trem.box) < beam.box.y;
		});
		expect(e.check(ok)).toMatchMeasurements([
			true,
			true,
			true,
			true,
			true,
			true,
			true,
		]);
	});

	it.concurrent('tremolo-within-stave (p. 222): stays inside stave lines', async () => {
		const e = await engrave('tremolos', 'tremolo-within-stave');
		const lines = e.lines(4);
		const topLine = must(lines[0], 'top stave line');
		const bottomLine = must(lines.at(-1), 'bottom stave line');
		const tremolos = tremoloGroups(e, 4);
		expect(tremolos).toHaveLength(4);
		const ok = tremolos.map((trem, idx) => {
			markBox(e, trem.box, `Ledger tremolo ${idx + 1}`);
			return (
				trem.box.y >= topLine - 1 && bottomEdge(trem.box) <= bottomLine + 1
			);
		});
		expect(e.check(ok)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('tremolo-whole-note (p. 222): centres on whole notehead', async () => {
		const e = await engrave('tremolos', 'tremolo-whole-note');
		const singleWidth = must(tremoloGroups(e, 1)[2], 'reference tremolo').box.w;
		const cases = [
			{ measure: 5, above: true, label: 'Low whole note' },
			{ measure: 6, above: false, label: 'High whole note' },
		] as const;
		const ok = cases.map(({ measure, above, label }) => {
			const note = must(e.headsIn(measure)[0], `${label} head`);
			const trem = must(tremoloGroups(e, measure)[0], `${label} tremolo`);
			const space = e.space(measure);
			markBox(e, trem.box, label);
			const centred =
				Math.abs(centre(trem.box) - centre(note.head)) <= 0.25 * space;
			const sideOk = above
				? bottomEdge(trem.box) < note.head.y
				: trem.box.y > bottomEdge(note.head);
			const widthOk =
				trem.box.w < note.head.w &&
				Math.abs(trem.box.w - singleWidth) <= 0.25 * space;
			return centred && sideOk && widthOk;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true]);
	});

	it.concurrent('tremolo-adjacent-chord (p. 222): centres on stem-side head', async () => {
		const e = await engrave('tremolos', 'tremolo-adjacent-chord');
		const singleWidth = must(tremoloGroups(e, 1)[2], 'reference tremolo').box.w;

		// Measure 8: two stemmed half-note adjacent seconds keep single-note stroke width.
		const stemmedSpace = e.space(7);
		const stemmedTremolos = tremoloGroups(e, 7);
		expect(stemmedTremolos).toHaveLength(2);
		const stemmedOk = stemmedTremolos.map((trem, idx) => {
			markBox(e, trem.box, `Stemmed chord ${idx + 1}`);
			return Math.abs(trem.box.w - singleWidth) <= 0.25 * stemmedSpace;
		});

		// Measure 9: whole-note adjacent second (G4+A4, notional stem up) centres on the left head.
		const wholeSpace = e.space(8);
		const wholeHeads = e.headsIn(8).sort((a, b) => a.head.x - b.head.x);
		expect(wholeHeads).toHaveLength(2);
		const leftHead = must(wholeHeads[0], 'left whole notehead').head;
		const rightHead = must(wholeHeads[1], 'right whole notehead').head;
		const wholeTrem = must(tremoloGroups(e, 8)[0], 'whole chord tremolo');
		markBox(e, wholeTrem.box, 'Whole chord');
		const wholeOk =
			Math.abs(wholeTrem.box.w - singleWidth) <= 0.25 * wholeSpace &&
			bottomEdge(wholeTrem.box) < Math.min(leftHead.y, rightHead.y) &&
			Math.abs(centre(wholeTrem.box) - centre(leftHead)) <= 0.25 * wholeSpace;

		expect(e.check([...stemmedOk, wholeOk])).toMatchMeasurements([
			true,
			true,
			true,
		]);
	});

	it.concurrent('tremolo-stroke-angle (p. 223): slants tremolo strokes upward from bottom-left to top-right regardless of stem or beam angle', async () => {
		const e = await engrave('tremolos', 'tremolo-stroke-angle');
		const tremolos = tremoloGroups(e, 9);
		expect(tremolos).toHaveLength(6);
		const upward = tremolos.map((group, i) => {
			markBox(e, group.box, `Tremolo ${i + 1}`);
			return group.strokes.every((s) => {
				const leftX = Math.round(s.box.x + s.box.w * 0.2);
				const rightX = Math.round(s.box.x + s.box.w * 0.8);
				const leftBands = s.bandsAt(leftX);
				const rightBands = s.bandsAt(rightX);
				if (leftBands.length === 0 || rightBands.length === 0) {
					return false;
				}
				const leftMean =
					leftBands.reduce((sum, [y0, y1]) => sum + (y0 + y1) / 2, 0) /
					leftBands.length;
				const rightMean =
					rightBands.reduce((sum, [y0, y1]) => sum + (y0 + y1) / 2, 0) /
					rightBands.length;
				return rightMean < leftMean;
			});
		});
		expect(e.check(upward)).toMatchMeasurements([
			true,
			true,
			true,
			true,
			true,
			true,
		]);
	});
});

/** Groups individual tremolo stroke masks in a measure into one group per note, left to right. */
function tremoloGroups(e: Engraving, measure: number): TremoloGroup[] {
	const strokes = e
		.inMeasure('tremolo', measure)
		.sort((a, b) => a.box.x - b.box.x || a.box.y - b.box.y);
	const groups: Ink[][] = [];
	for (const stroke of strokes) {
		const prev = groups.at(-1);
		if (
			prev &&
			Math.abs(centre(stroke.box) - centre(must(prev[0], 'stroke').box)) <= 4
		) {
			prev.push(stroke);
		} else {
			groups.push([stroke]);
		}
	}
	return groups.map((group) => {
		const x = Math.min(...group.map((s) => s.box.x));
		const y = Math.min(...group.map((s) => s.box.y));
		const r = Math.max(...group.map((s) => rightEdge(s.box)));
		const b = Math.max(...group.map((s) => bottomEdge(s.box)));
		return { strokes: group, box: { x, y, w: r - x, h: b - y } };
	});
}
