import { describe, expect, it } from 'bun:test';
import type { Box, Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { centre, distance, markBox } from './engraving-spacing-measures';

describe('Behind Bars duration dots', () => {
	it.concurrent('draws dots on single notes, chords and simultaneous voices', async () => {
		expect(await draw('duration-dots')).toMatchScreenshot(
			'engraving_duration-dots.png',
		);
	});

	it.concurrent('chord-voices-crossed-adjacent (p. 54): puts the down-stem head left in a crossed second', async () => {
		const e = await engrave('duration-dots', 'chord-voices-crossed-adjacent');
		const up = voiceHead(e, 30, '1');
		const down = voiceHead(e, 30, '2');
		expect(e.check(centre(down) < centre(up))).toMatchMeasurements(true);
	});

	it.concurrent('dot-duration-size (p. 54): draws a larger duration dot than staccato dot', async () => {
		const e = await engrave('duration-dots', 'dot-duration-size');
		const { duration, staccato } = singleWithStaccato(e);
		expect(e.check(duration.count() > staccato.count())).toMatchMeasurements(
			true,
		);
	});

	it.concurrent('dot-head-gap (p. 54): leaves about half a stave space at the head', async () => {
		const e = await engrave('duration-dots', 'dot-head-gap');
		const { duration } = singleWithStaccato(e);
		const gaps = [duration.box, onlyDot(e, 2).box].map((dot, i) => {
			const head = voiceHead(e, i + 1, '1');
			distance(
				e,
				i,
				head.x + head.w,
				dot.x,
				'Clear head-to-dot gap',
				dot.y - 4,
			);
			return headGap(head, dot);
		});
		expect(
			e.check(gaps.map((gap, i) => near(gap, e.space(i) / 2, 2))),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('dot-multiple-spacing: keeps double and triple dots close and evenly spaced (p. 54)', async () => {
		const e = await engrave('duration-dots', 'dot-multiple-spacing');
		expect(
			e.check([compactRow(e, 4, 3), compactRow(e, 31, 2)]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('dot-space-position (p. 54): centres a space-note dot with its head', async () => {
		const e = await engrave('duration-dots', 'dot-space-position');
		const { duration } = singleWithStaccato(e);
		expect(
			e.check(near(midY(duration.box), midY(voiceHead(e, 1, '1')))),
		).toMatchMeasurements(true);
	});

	it.concurrent('dot-line-position (p. 54): puts the dot in the space above the line note', async () => {
		const e = await engrave('duration-dots', 'dot-line-position');
		expect(
			e.check(dotOnSide(e, 2, voiceHead(e, 2, '1'), -1)),
		).toMatchMeasurements(true);
	});

	it.concurrent('dot-ledger-position (p. 55): puts the dot in the space above the ledger line', async () => {
		const e = await engrave('duration-dots', 'dot-ledger-position');
		expect(
			e.check(dotOnSide(e, 3, voiceHead(e, 3, '1'), -1)),
		).toMatchMeasurements(true);
	});

	it.concurrent('dot-flag-clearance (p. 55): keeps the dot clear of an up-stem flag', async () => {
		const e = await engrave('duration-dots', 'dot-flag-clearance');
		const dot = onlyDot(e, 5);
		const flag = must(e.inMeasure('flag', 4)[0], 'eighth-note flag');
		markBox(e, flag.box, 'Flag');
		expect(e.check(dot.overlaps(flag) === 0)).toMatchMeasurements(true);
	});

	it.concurrent('dot-chord-column (p. 55): puts one dot per head in a column after the chord', async () => {
		const e = await engrave('duration-dots', 'dot-chord-column');
		const dots = dotInk(e, 6).map(({ box }) => box);
		const chord = heads(e, 6);
		expect(e.check(inColumnAfter(dots, chord))).toMatchMeasurements(true);
	});

	it.concurrent('dot-chord-line-side (p. 55): puts dots on opposite sides of line notes in seconds', async () => {
		const e = await engrave('duration-dots', 'dot-chord-line-side');
		const upper = must(heads(e, 7).sort((a, b) => a.y - b.y)[0], 'upper head');
		const lower = must(heads(e, 8).sort((a, b) => b.y - a.y)[0], 'lower head');
		const [above] = dotInk(e, 7)
			.map(({ box }) => box)
			.sort((a, b) => a.y - b.y);
		const [below] = dotInk(e, 8)
			.map(({ box }) => box)
			.sort((a, b) => b.y - a.y);
		expect(
			e.check([
				!!above && onSide(e, 7, upper, above, -1),
				!!below && onSide(e, 8, lower, below, 1),
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('dot-chord-distinct-spaces (p. 55): separates dots into distinct spaces through the ledger lines', async () => {
		const e = await engrave('duration-dots', 'dot-chord-distinct-spaces');
		expect(
			e.check([9, 10].map((m) => distinctChordRows(e, m))),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('dot-chord-centred (p. 56): balances the dot column around the heads', async () => {
		const e = await engrave('duration-dots', 'dot-chord-centred');
		const chord = heads(e, 10);
		const dots = dotInk(e, 10).map(({ box }) => box);
		const centreOfSpan = (boxes: Box[]) => {
			const ys = boxes.map(midY);
			return (Math.min(...ys) + Math.max(...ys)) / 2;
		};
		expect(
			e.check(
				new Set(dots.map((dot) => spaceRow(e, 10, dot))).size ===
					chord.length &&
					near(centreOfSpan(dots), centreOfSpan(chord), e.space(9) / 2),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('dot-chord-dense-count (p. 56): keeps extremely dense chord dots within the span', async () => {
		const e = await engrave('duration-dots', 'dot-chord-dense-count');
		const m = 11;
		const chord = heads(e, m);
		const dots = dotInk(e, m).map(({ box }) => box);
		const top = Math.min(...chord.map(midY));
		const bottom = Math.max(...chord.map(midY));
		const space = e.space(m - 1);
		// Count implied space rows between the outer pitches, inclusive of a space pitch at either end.
		const origin = e.middle(m - 1) + space / 2;
		const first = Math.ceil((top - origin) / space);
		const last = Math.floor((bottom - origin) / space);
		const rows = dots.map((dot) => spaceRow(e, m, dot));
		expect(
			e.check(
				dots.length === last - first + 1 &&
					new Set(rows).size === dots.length &&
					rows.every((row) => row >= first && row <= last) &&
					inColumnAfter(dots, chord, last - first + 1),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('dot-lower-voice-line (p. 56): puts a lower-voice dot below an ordinary line note', async () => {
		const e = await engrave('duration-dots', 'dot-lower-voice-line');
		// Upper attack, upper rest and sustain, a line chord, separated unisons.
		const measures: [number, number][] = [
			[12, 1],
			[33, 2],
			[34, 1],
			[35, 2],
			[26, 1],
			[28, 1],
		];
		expect(
			e.check(measures.map(([m, count]) => lowerDotsBelow(e, m, count))),
		).toMatchMeasurements(measures.map(() => true));
	});

	it.concurrent('dot-adjacent-both-voices (pp. 56–57): aligns both dots in one column after touching uncrossed seconds', async () => {
		const e = await engrave('duration-dots', 'dot-adjacent-both-voices');
		const m = 13;
		const up = voiceHead(e, m, '1');
		const down = voiceHead(e, m, '2');
		const headInk = e.inMeasure('notehead', m - 1);
		const dots = dotInk(e, m);
		const dotBoxes = dots.map(({ box }) => box);
		const rows = dotBoxes.map((dot) => spaceRow(e, m, dot));
		const stems = e.inMeasure('stem', m - 1);
		for (const { box } of stems) {
			markBox(e, box, 'Stem');
		}
		const touching = up.x < down.x && near(up.x + up.w, down.x, 3);
		expect(
			e.check(
				touching &&
					inColumnAfter(dotBoxes, [up, down], 2) &&
					dotBoxes.every((dot) => beside(e, m, down, dot)) &&
					new Set(rows).size === 2 &&
					rows.every(Number.isFinite) &&
					stems.length === 2 &&
					dots.every(
						(dot) =>
							headInk.every((head) => dot.overlaps(head) === 0) &&
							stems.every((stem) => dot.overlaps(stem) === 0),
					),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('dot-adjacent-lower-only (p. 56): keeps a lone lower-voice dot beside its head', async () => {
		const e = await engrave('duration-dots', 'dot-adjacent-lower-only');
		const lower = voiceHead(e, 15, '2');
		const dot = onlyDot(e, 15).box;
		expect(
			e.check(onSide(e, 15, lower, dot, 1) && beside(e, 15, lower, dot)),
		).toMatchMeasurements(true);
	});

	it.concurrent('dot-voice-chord-columns (p. 57): aligns the dots of each voice independently', async () => {
		const e = await engrave('duration-dots', 'dot-voice-chord-columns');
		const dots = dotInk(e, 16)
			.map(({ box }) => box)
			.sort((a, b) => a.y - b.y);
		const upper = voiceHeads(e, 16, '1');
		const lower = voiceHeads(e, 16, '2');
		expect(
			e.check([
				dots.length === 4 && inColumnAfter(dots.slice(0, 2), upper),
				dots.length === 4 && inColumnAfter(dots.slice(2), lower),
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('dot-crossed-stem-clearance (p. 57): keeps a crossed stem clear of a lone dot', async () => {
		const e = await engrave('duration-dots', 'dot-crossed-stem-clearance');
		// Measures 17 and 36 dot the lower part and measure 37 the upper one.
		// Each pair sits diagonally side by side, the down-stem head left, and
		// the dot touches neither head.
		const cases = [
			{ m: 17, dotted: '1' },
			{ m: 36, dotted: '1' },
			{ m: 37, dotted: '2' },
		];
		expect(
			e.check(
				cases.map(({ m, dotted }) => {
					const up = voiceHead(e, m, '1');
					const down = voiceHead(e, m, '2');
					const dot = onlyDot(e, m);
					const dotClear = e
						.inMeasure('notehead', m - 1)
						.every((head) => dot.overlaps(head) === 0);
					return sideBySide(down, up) && dotClear && clearLoneDot(e, m, dotted);
				}),
			),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('dot-crossed-second-column (p. 57): aligns both dots in one column after crossed seconds', async () => {
		const e = await engrave('duration-dots', 'dot-crossed-second-column');
		const m = 18;
		const up = voiceHead(e, m, '1');
		const down = voiceHead(e, m, '2');
		const headInk = e.inMeasure('notehead', m - 1);
		const dots = dotInk(e, m);
		const dotBoxes = dots.map(({ box }) => box);
		const rows = dotBoxes.map((dot) => spaceRow(e, m, dot));
		const stems = e.inMeasure('stem', m - 1);
		for (const { box } of stems) {
			markBox(e, box, 'Stem');
		}
		expect(
			e.check(
				inColumnAfter(dotBoxes, [up, down], 2) &&
					new Set(rows).size === 2 &&
					rows.every(Number.isFinite) &&
					stems.length === 2 &&
					dots.every(
						(dot) =>
							headInk.every((head) => dot.overlaps(head) === 0) &&
							stems.every((stem) => dot.overlaps(stem) === 0),
					),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('dot-crossed-adjacent-upper (p. 57): puts the upper voice dot between the crossed heads', async () => {
		const e = await engrave('duration-dots', 'dot-crossed-adjacent-upper');
		const upper = voiceHead(e, 19, '1');
		const lower = voiceHead(e, 19, '2');
		const dot = onlyDot(e, 19).box;
		expect(
			e.check(beside(e, 19, upper, dot) && dot.x + dot.w <= lower.x),
		).toMatchMeasurements(true);
	});

	it.concurrent('dot-crossed-adjacent-lower (p. 58): puts the crossed down-stem dot above its line note', async () => {
		const e = await engrave('duration-dots', 'dot-crossed-adjacent-lower');
		const up = voiceHead(e, 20, '1');
		const down = voiceHead(e, 20, '2');
		const clearGap = down.x - (up.x + up.w) >= e.space(19) / 3;
		expect(e.check(dotOnSide(e, 20, down, -1) && clearGap)).toMatchMeasurements(
			true,
		);
	});

	it.concurrent('dot-crossed-chords (p. 58): aligns all dots in one column after crossed dotted chords', async () => {
		const e = await engrave('duration-dots', 'dot-crossed-chords');
		const m = 21;
		const chord = heads(e, m);
		const headInk = e.inMeasure('notehead', m - 1);
		const dots = dotInk(e, m);
		const dotBoxes = dots.map(({ box }) => box);
		const rows = dotBoxes.map((dot) => spaceRow(e, m, dot));
		const stems = e.inMeasure('stem', m - 1);
		for (const { box } of stems) {
			markBox(e, box, 'Stem');
		}
		expect(
			e.check(
				inColumnAfter(dotBoxes, chord, 4) &&
					new Set(rows).size === 4 &&
					rows.every(Number.isFinite) &&
					stems.length === 2 &&
					dots.every(
						(dot) =>
							headInk.every((head) => dot.overlaps(head) === 0) &&
							stems.every((stem) => dot.overlaps(stem) === 0),
					),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('dot-unison-one-stem (p. 58): gives unison heads distinct dot rows in one voice', async () => {
		const e = await engrave('duration-dots', 'dot-unison-one-stem');
		expect(
			e.check([22, 32].map((measure) => dottedUnisonRows(e, measure))),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('dot-unison-pronged (p. 58): stacks altered-unison dots vertically on separate spaces after both heads', async () => {
		const e = await engrave('duration-dots', 'dot-unison-pronged');
		const m = 23;
		const chord = heads(e, m);
		const [head] = chord;
		const headInk = e.inMeasure('notehead', m - 1);
		const dots = dotInk(e, m);
		const dotBoxes = dots.map(({ box }) => box);
		const rows = dotBoxes.map((dot) => spaceRow(e, m, dot));
		const flag = must(e.inMeasure('flag', m - 1)[0], 'eighth-note flag');
		markBox(e, flag.box, 'Flag');
		expect(
			e.check(
				!!head &&
					inColumnAfter(dotBoxes, chord, 2) &&
					new Set(rows).size === 2 &&
					rows.every(Number.isFinite) &&
					dotBoxes.every(
						(dot) => Math.abs(midY(dot) - midY(head)) <= e.space(m - 1),
					) &&
					dots.every(
						(dot) =>
							headInk.every((h) => dot.overlaps(h) === 0) &&
							dot.overlaps(flag) === 0,
					),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('dot-unison-shared-head (p. 58): shows one visible dot on a shared head', async () => {
		const e = await engrave('duration-dots', 'dot-unison-shared-head');
		const up = voiceHead(e, 24, '1');
		const down = voiceHead(e, 24, '2');
		const dots = dotInk(e, 24).map(({ box }) => box);
		const stems = e.inMeasure('stem', 23);
		expect(
			e.check(
				near(centre(up), centre(down)) &&
					stems.length === 2 &&
					!!dots[0] &&
					sameRow(dots) &&
					sameColumn(dots) &&
					beside(e, 24, up, dots[0]),
			),
		).toMatchMeasurements(true);
	});

	it('dot-unison-whole-heads (p. 59): keeps both whole-note dots clear and distinct', async () => {
		const e = await engrave('duration-dots', 'dot-unison-whole-heads');
		const m = 25;
		const headInk = e
			.inMeasure('notehead', m - 1)
			.sort((a, b) => a.box.x - b.box.x);
		const dots = dotInk(e, m).sort((a, b) => a.box.x - b.box.x);
		const [left, right] = heads(e, m).sort((a, b) => a.x - b.x);
		const [leftDot, rightDot] = dots;
		expect(
			e.check(
				!!left &&
					!!right &&
					headInk.length === 2 &&
					!near(left.x, right.x) &&
					dots.length === 2 &&
					!!leftDot &&
					!!rightDot &&
					!near(centre(leftDot.box), centre(rightDot.box)) &&
					beside(e, m, left, leftDot.box) &&
					beside(e, m, right, rightDot.box) &&
					dots.every((dot) =>
						headInk.every((head) => dot.overlaps(head) === 0),
					),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('dot-crossed-both-parts (p. 57): aligns both dots in one column after crossed thirds and fourths', async () => {
		const e = await engrave('duration-dots', 'dot-crossed-both-parts');
		expect(
			e.check([29, 38].map((m) => sideBySideDotColumn(e, m))),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('dot-unison-unlike-heads (p. 59): keeps unlike unison heads touching with both dots stacked after them', async () => {
		const e = await engrave('duration-dots', 'dot-unison-unlike-heads');
		const m = 26;
		const up = voiceHead(e, m, '1');
		const down = voiceHead(e, m, '2');
		const headInk = e.inMeasure('notehead', m - 1);
		const stems = e.inMeasure('stem', m - 1);
		const dots = dotInk(e, m);
		expect(
			e.check(
				touching(e, m, up, down) &&
					dottedUnisonRows(e, m) &&
					inColumnAfter(
						dots.map(({ box }) => box),
						[up, down],
						2,
					) &&
					dots.every(
						(dot) =>
							headInk.every((head) => dot.overlaps(head) === 0) &&
							stems.every((stem) => dot.overlaps(stem) === 0),
					),
			),
		).toMatchMeasurements(true);
	});

	it.concurrent('dot-unison-one-voice (p. 59): keeps dotted and plain unison heads touching with the dot after both', async () => {
		const e = await engrave('duration-dots', 'dot-unison-one-voice');
		const dotAfterBoth = (m: number) => {
			const up = voiceHead(e, m, '1');
			const down = voiceHead(e, m, '2');
			const dot = onlyDot(e, m);
			const headInk = e.inMeasure('notehead', m - 1);
			const stems = e.inMeasure('stem', m - 1);
			return (
				touching(e, m, up, down) &&
				beside(e, m, down, dot.box) &&
				headInk.every((head) => dot.overlaps(head) === 0) &&
				stems.every((stem) => dot.overlaps(stem) === 0)
			);
		};
		expect(e.check([dotAfterBoth(27), dotAfterBoth(28)])).toMatchMeasurements([
			true,
			true,
		]);
	});
});

function dotInk(e: Engraving, measure: number): Ink[] {
	const dots = e.inMeasure('augmentation-dot', measure - 1);
	for (const { box } of dots) {
		markBox(e, box, 'Dot glyph');
	}
	return dots;
}

function onlyDot(e: Engraving, measure: number): Ink {
	const dots = dotInk(e, measure);
	expect(dots).toHaveLength(1);
	return must(dots[0], 'duration dot');
}

function singleWithStaccato(e: Engraving): { duration: Ink; staccato: Ink } {
	const head = voiceHead(e, 1, '1');
	const dots = [...dotInk(e, 1), ...e.inMeasure('staccato-dot', 0)];
	// This fixture has a staccato below its head and a duration dot to the right.
	// VexFlow can use the augmentation glyph for either kind of dot.
	const duration = must(
		dots.find(({ box }) => box.x >= head.x + head.w),
		'duration dot',
	);
	const staccato = must(
		dots.find(({ box }) => box !== duration.box),
		'staccato dot',
	);
	markBox(e, staccato.box, 'Staccato');
	return { duration, staccato };
}

function heads(e: Engraving, measure: number): Box[] {
	return voiceHeads(e, measure);
}

function voiceHeads(e: Engraving, measure: number, voice?: string): Box[] {
	const boxes = e.headsIn(measure - 1, { voice }).map(({ head }) => head);
	for (const box of boxes) {
		markBox(e, box, voice ? `Voice ${voice} head` : 'Notehead');
	}
	return boxes;
}

// The right head starts where the left head ends, give or take a pixel.
function sideBySide(left: Box, right: Box): boolean {
	return near(left.x + left.w, right.x, 2) || left.x + left.w < right.x;
}

// The upper head is left and the lower head starts within a quarter space of
// its right edge, without overlapping it.
function touching(e: Engraving, measure: number, up: Box, down: Box): boolean {
	const gap = down.x - (up.x + up.w);
	return gap >= -1 && gap <= e.space(measure - 1) / 4;
}

// The one dot sits beside its head with no stem crossing the gap between.
function clearLoneDot(e: Engraving, m: number, voice: string): boolean {
	const head = voiceHead(e, m, voice);
	const dot = onlyDot(e, m).box;
	const stems = e.inMeasure('stem', m - 1);
	for (const { box } of stems) {
		markBox(e, box, 'Stem');
	}
	const between = stems.some(
		({ box }) =>
			box.x >= head.x + head.w &&
			box.x < dot.x + dot.w &&
			box.y < dot.y + dot.h &&
			box.y + box.h > dot.y,
	);
	return stems.length === 2 && beside(e, m, head, dot) && !between;
}

// Crossed dotted heads stand side by side, down-stem left, their dots in one
// column after both on separate spaces, clear of the up-stem, touching no
// head or stem.
function sideBySideDotColumn(e: Engraving, m: number): boolean {
	const up = voiceHead(e, m, '1');
	const down = voiceHead(e, m, '2');
	const headInk = e.inMeasure('notehead', m - 1);
	const dots = dotInk(e, m);
	const dotBoxes = dots.map(({ box }) => box);
	const rows = dotBoxes.map((dot) => spaceRow(e, m, dot));
	const stems = e.inMeasure('stem', m - 1);
	for (const { box } of stems) {
		markBox(e, box, 'Stem');
	}
	// The column clears the up-stem by about half a space, as a dot its head.
	const stemRight = Math.max(...stems.map(({ box }) => box.x + box.w));
	const stemGap = Math.min(...dotBoxes.map((dot) => dot.x)) - stemRight;
	return (
		sideBySide(down, up) &&
		stemGap >= e.space(m - 1) / 2 - 1 &&
		inColumnAfter(dotBoxes, [up, down], 2) &&
		new Set(rows).size === 2 &&
		rows.every(Number.isFinite) &&
		stems.length === 2 &&
		dots.every(
			(dot) =>
				headInk.every((head) => dot.overlaps(head) === 0) &&
				stems.every((stem) => dot.overlaps(stem) === 0),
		)
	);
}

function voiceHead(e: Engraving, measure: number, voice: string): Box {
	return must(voiceHeads(e, measure, voice)[0], `voice ${voice} head`);
}

function near(a: number, b: number, tolerance = 1): boolean {
	return Math.abs(a - b) <= tolerance;
}

function midY(box: Box): number {
	return box.y + box.h / 2;
}

function sameRow(boxes: Box[]): boolean {
	const [first] = boxes;
	return !!first && boxes.every((box) => near(midY(box), midY(first)));
}

function sameColumn(boxes: Box[]): boolean {
	const [first] = boxes;
	return !!first && boxes.every((box) => near(centre(box), centre(first)));
}

function headGap(head: Box, dot: Box): number {
	return dot.x - (head.x + head.w);
}

function beside(e: Engraving, measure: number, head: Box, dot: Box): boolean {
	const gap = headGap(head, dot);
	return gap >= -1 && gap <= e.space(measure - 1);
}

function inColumnAfter(
	dots: Box[],
	chord: Box[],
	count = chord.length,
): boolean {
	return (
		dots.length === count &&
		sameColumn(dots) &&
		dots.every((dot) => chord.every((head) => headGap(head, dot) >= -1))
	);
}

function dotOnSide(
	e: Engraving,
	measure: number,
	head: Box,
	side: -1 | 1,
): boolean {
	return onSide(e, measure, head, onlyDot(e, measure).box, side);
}

// Every dot lower than the upper voice's heads sits half a space below a
// lower-voice head to its left.
function lowerDotsBelow(e: Engraving, measure: number, count: number): boolean {
	const lower = voiceHeads(e, measure, '2');
	const top = Math.min(...voiceHeads(e, measure, '1').map(midY));
	const dots = dotInk(e, measure)
		.map(({ box }) => box)
		.filter((dot) => midY(dot) > top);
	return (
		dots.length === count &&
		dots.every((dot) =>
			lower.some((head) => head.x < dot.x && onSide(e, measure, head, dot, 1)),
		)
	);
}

function onSide(
	e: Engraving,
	measure: number,
	head: Box,
	dot: Box,
	side: -1 | 1,
): boolean {
	return near(midY(dot), midY(head) + (side * e.space(measure - 1)) / 2);
}

/** Index of an actual dot's row, extending the stave grid through ledger lines. */
function spaceRow(e: Engraving, measure: number, dot: Box): number {
	const space = e.space(measure - 1);
	const origin = e.middle(measure - 1) + space / 2;
	const row = Math.round((midY(dot) - origin) / space);
	return near(midY(dot), origin + row * space) ? row : Number.NaN;
}

function distinctChordRows(e: Engraving, measure: number): boolean {
	const dots = dotInk(e, measure).map(({ box }) => box);
	const rows = dots.map((dot) => spaceRow(e, measure, dot));
	return (
		inColumnAfter(dots, heads(e, measure)) &&
		new Set(rows).size === dots.length &&
		rows.every(Number.isFinite)
	);
}

function compactRow(e: Engraving, measure: number, count: number): boolean {
	const dots = dotInk(e, measure)
		.map(({ box }) => box)
		.sort((a, b) => a.x - b.x);
	const [first, second] = dots;
	if (dots.length !== count || !first || !second || !sameRow(dots)) {
		return false;
	}
	const gap = centre(second) - centre(first);
	return (
		gap <= e.space(measure - 1) &&
		dots.slice(1).every((dot, i) => {
			const previous = must(dots[i], 'previous dot');
			return (
				headGap(previous, dot) > 0 && near(centre(dot) - centre(previous), gap)
			);
		})
	);
}

function dottedUnisonRows(e: Engraving, measure: number): boolean {
	const dots = dotInk(e, measure).map(({ box }) => box);
	const chord = heads(e, measure);
	const [head] = chord;
	const rows = dots.map((dot) => spaceRow(e, measure, dot));
	return (
		!!head &&
		chord.length === 2 &&
		dots.length === 2 &&
		sameColumn(dots) &&
		new Set(rows).size === 2 &&
		rows.every(Number.isFinite) &&
		dots.every(
			(dot) => Math.abs(midY(dot) - midY(head)) <= e.space(measure - 1),
		)
	);
}
