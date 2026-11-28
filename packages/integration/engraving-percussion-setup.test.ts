import { describe, expect, it } from 'bun:test';
import type { Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';

// Behind Bars, pp. 269–286: percussion setup, tuned percussion, and indefinite-pitch line notation.
// - percussion-tuned.musicxml: treble clef with 8va (M1) and 15ma (M2 mid-system, M3 new system).
// - percussion-lines.musicxml: P1 1-line stave (M1 default stems, M2 grace notes before down-stems);
//   P2 3-line stave and P3 2-line stave with notes on outer lines.
// - percussion-rests.musicxml: P1 2-line stave and P2 3-line stave with whole, half, quarter,
//   eighth, and sixteenth rests.
// - percussion-voices.musicxml: 2-line stave with two overlapping sustained voices (M1) and
//   single-voice continuation (M2).

describe('Behind Bars percussion setup, tuned, and line notation (pp. 269–286)', () => {
	it.concurrent('draws percussion-tuned', async () => {
		expect(await draw('percussion-tuned')).toMatchScreenshot(
			'engraving_percussion-tuned.png',
		);
	});

	it.concurrent('draws percussion-lines', async () => {
		expect(await draw('percussion-lines')).toMatchScreenshot(
			'engraving_percussion-lines.png',
		);
	});

	it.concurrent('draws percussion-rests', async () => {
		expect(await draw('percussion-rests')).toMatchScreenshot(
			'engraving_percussion-rests.png',
		);
	});

	it.concurrent('draws percussion-voices', async () => {
		expect(await draw('percussion-voices')).toMatchScreenshot(
			'engraving_percussion-voices.png',
		);
	});

	// Clarify one- and two-octave tuned-percussion transpositions with 8 or 15 above the treble clef.
	it.concurrent('perc-octave-transposing-clef (p. 276): draws 8 and 15 above clefs', async () => {
		const e = await engrave('percussion-tuned', 'perc-octave-transposing-clef');
		const m1Clefs = e.inMeasure('clef', 0).sort((a, b) => a.box.x - b.box.x);
		const m1Clef = must(m1Clefs[0], 'M1 opening 8va clef');
		const m2Clef = must(m1Clefs[1], 'M1 trailing courtesy 15ma clef');
		const m3Clef = must(e.inMeasure('clef', 2)[0], 'M3 opening 15ma clef');

		const top1 = must(e.lines(0)[0], 'M1 top stave line');
		const top3 = must(e.lines(2)[0], 'M3 top stave line');
		const space1 = e.space(0);
		const space3 = e.space(2);

		markBox(e, m1Clef.box, 'M1 8va clef');
		markBox(e, m2Clef.box, 'M2 courtesy 15ma clef');
		markBox(e, m3Clef.box, 'M3 15ma clef');

		// A plain full-size treble clef extends ~1.4 spaces above line 0; with an 8 or 15 above
		// it reaches ~2.3 spaces. A plain small change clef sits just below line 0 (~-0.1 spaces);
		// with 15 above it reaches ~0.5 spaces above line 0.
		const m1Above = (top1 - m1Clef.box.y) / space1;
		const m2Above = (top1 - m2Clef.box.y) / space1;
		const m3Above = (top3 - m3Clef.box.y) / space3;

		expect(
			e.check([
				m1Above >= 2.0 && m1Above <= 3.5,
				m2Above >= 0.35 && m2Above <= 1.5,
				m3Above >= 2.0 && m3Above <= 3.5,
			]),
		).toMatchMeasurements([true, true, true]);
	});

	// On a single-line percussion stave, default stems point upward.
	// fix: #4720
	it.todo('perc-single-line-stem-direction (p. 283): single-line stems up');

	// On a single-line percussion stave, grace notes take up-stems regardless of main-note stem direction.
	it.concurrent('perc-single-line-grace-stem (p. 283): keeps grace-note stems upward on a single-line stave', async () => {
		const e = await engrave('percussion-lines', 'perc-single-line-grace-stem');
		const graceHeads = e.notes.filter(
			(n) => n.measure === 1 && (n.part ?? 0) === 0 && n.grace,
		);
		const stems = e.inMeasure('stem', 1, 0);
		const space = e.space(1, 0);
		const dirs = graceHeads.map((g) => {
			const hcx = g.head.x + g.head.w / 2;
			const hcy = g.head.y + g.head.h / 2;
			const stem = must(
				stems
					.filter((s) => Math.abs(s.box.x + s.box.w / 2 - hcx) <= 1.2 * space)
					.sort(
						(a, b) =>
							Math.abs(a.box.x + a.box.w / 2 - hcx) -
							Math.abs(b.box.x + b.box.w / 2 - hcx),
					)[0],
				'grace note stem',
			);
			const dir = stem.box.y + stem.box.h / 2 < hcy ? 'up' : 'down';
			markBox(e, stem.box, `grace ${dir}`);
			return dir;
		});
		expect(e.check(dirs)).toMatchMeasurements(['up', 'up', 'up']);
	});

	// On a two- or three-line percussion stave, stems point into the middle of the group of lines.
	// fix: #4720
	it.todo('perc-multi-line-stem-direction (p. 283): multi-line stems inward');

	// On a two-line stave, centre rests around the middle space.
	it.concurrent('perc-two-line-rests (p. 284): centres rests around the middle space of a 2-line stave', async () => {
		const e = await engrave('percussion-rests', 'perc-two-line-rests');
		// Reduced 2-line stave hides lines 0, 3, 4; visible lines are indices 1 (top) and 2 (bottom).
		const lines1 = e.lines(0, 0);
		const lines2 = e.lines(1, 0);
		const top1 = must(lines1[1], 'M1 top visible line');
		const top2 = must(lines2[1], 'M2 top visible line');
		const bot2 = must(lines2[2], 'M2 bottom visible line');
		const mid2 = (top2 + bot2) / 2;
		const space = e.space(0, 0);

		const whole = must(e.restsIn(0, 0)[0], 'M1 whole rest');
		const rests2 = e.restsIn(1, 0);
		const half = must(rests2[0], 'M2 half rest');
		const quarter = must(rests2[1], 'M2 quarter rest');
		const eighth = must(rests2[2], 'M2 eighth rest');

		markBox(e, whole.head, 'whole');
		markBox(e, half.head, 'half');
		markBox(e, quarter.head, 'quarter');
		markBox(e, eighth.head, 'eighth');

		const wholeHangsFromTop = Math.abs(whole.head.y - top1) <= 0.35 * space;
		const halfSitsOnBottom =
			Math.abs(half.head.y + half.head.h - bot2) <= 0.35 * space;
		const quarterCentred =
			Math.abs(quarter.head.y + quarter.head.h / 2 - mid2) <= 0.6 * space;
		const eighthCentred =
			Math.abs(eighth.head.y + eighth.head.h / 2 - mid2) <= 0.6 * space;

		expect(
			e.check([
				wholeHangsFromTop,
				halfSitsOnBottom,
				quarterCentred,
				eighthCentred,
			]),
		).toMatchMeasurements([true, true, true, true]);
	});

	// On a three-line stave, centre rests on the middle line.
	// fix: #4721
	it.todo('perc-three-line-rests (p. 284): whole rest hangs from middle line');

	// Overlapping sustained notes on different percussion instruments take opposing stems and rests.
	it.concurrent('perc-sustained-two-voices (p. 286): separates two sustained percussion voices with opposing stems and rests', async () => {
		const e = await engrave('percussion-voices', 'perc-sustained-two-voices');
		const pairs = inkStemDirections(e, 0, 0);
		const rests = e.restsIn(0, 0);
		for (const p of pairs) {
			markBox(e, p.stem.box, p.dir);
		}
		for (const r of rests) {
			markBox(e, r.head, 'rest');
		}
		const dirs = pairs.map((p) => p.dir);
		const hasUp = dirs.includes('up');
		const hasDown = dirs.includes('down');
		const firstRest = must(rests[0], 'first voice rest');
		const secondRest = must(rests[1], 'second voice rest');
		const restsSeparated =
			Math.abs(firstRest.head.y - secondRest.head.y) >= 0.5 * e.space(0, 0);
		expect(e.check([hasUp, hasDown, restsSeparated])).toMatchMeasurements([
			true,
			true,
			true,
		]);
	});
});

/** Stem direction of an ink stem relative to its nearest notehead in the same measure/part. */
function inkStemDirections(
	e: Engraving,
	measure: number,
	part: number,
): { head: Ink; stem: Ink; dir: 'up' | 'down' }[] {
	const heads = e
		.inMeasure('notehead', measure, part)
		.sort((a, b) => a.box.x - b.box.x);
	const stems = e
		.inMeasure('stem', measure, part)
		.sort((a, b) => a.box.x - b.box.x);
	const space = e.space(measure, part);
	const out: { head: Ink; stem: Ink; dir: 'up' | 'down' }[] = [];
	for (const head of heads) {
		const hcx = head.box.x + head.box.w / 2;
		const hcy = head.box.y + head.box.h / 2;
		const match = stems
			.filter((s) => Math.abs(s.box.x + s.box.w / 2 - hcx) <= 1.2 * space)
			.sort(
				(a, b) =>
					Math.abs(a.box.x + a.box.w / 2 - hcx) -
					Math.abs(b.box.x + b.box.w / 2 - hcx),
			)[0];
		if (!match) {
			continue;
		}
		const scy = match.box.y + match.box.h / 2;
		out.push({ head, stem: match, dir: scy < hcy ? 'up' : 'down' });
	}
	return out;
}
