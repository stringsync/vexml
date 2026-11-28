import { describe, expect, it } from 'bun:test';
import type { Ink } from './engraving-ink';
import { formatSpaces } from './engraving-marks';
import { bandHeight, type Engraving } from './engraving-model';
import { draw, engrave, must, quarters } from './engraving-render';

// Behind Bars, pp. 28–31: octave signs (ENGRAVING.md). octave.musicxml, treble, 4/4:
// - M1: 8va over accented C6 D6 E6 F6. M2: 8va over C6 and a dotted-half D6.
// - M3: 8va over a single C6, then G4s. M4: 8vb under A3 F3 A3 F3.
// - M5 to M6: 8va across a forced system break, ending on beat 2 of M6.
// - M7: 8va over two eighth-note triplets and a half. M8: 8va over a trilled dotted half.

describe('Behind Bars octave signs (pp. 28–31)', () => {
	it.concurrent('draws octave', async () => {
		expect(await draw('octave')).toMatchScreenshot('engraving_octave.png');
	});

	// The 8 is italic and 1½ spaces high, placed just left of the first note it covers.
	it.concurrent('octave-numeral (p. 28): draws the 8 1½ high, left of the first note', async () => {
		expect(await numeralFit()).toMatchMeasurements({
			height: 1.5,
			side: 'left of the note',
		});
	});

	// The line runs from the top of the 8 above the stave, from its base below.
	it.concurrent('octave-line-edge (p. 28): runs the line from the 8’s outer edge', async () => {
		expect(await lineEdges()).toMatchMeasurements([0, 0]);
	});

	// The octave sign sits outside the other notation and never cuts through it.
	it.concurrent('octave-clear (p. 29): keeps octave lines clear of other notation', async () => {
		expect(await inkUnderOctaveLines()).toMatchMeasurements([]);
	});

	// Of octave lines, slurs and tuplet brackets, the longest goes outside.
	it.concurrent('octave-longest-outside (p. 29): puts the octave line outside tuplets', async () => {
		expect(await aboveTuplets()).toMatchMeasurements({
			hasTuplets: true,
			allBelow: true,
		});
	});

	// At a system's end the line stops at the last barline; the next system repeats the 8.
	it.concurrent('octave-system-break (p. 30): stops at the barline and resumes with an 8', async () => {
		expect(await systemBreak()).toMatchMeasurements({
			endsAtBarline: true,
			resumes: 1,
		});
	});

	// The line ends in a corner right after the last head and its dots.
	it.concurrent('octave-end-corner (p. 30): ends in a corner just after the last head', async () => {
		expect(await endCorner()).toMatchMeasurements({
			end: 'just after the dot',
			corner: true,
		});
	});

	// With a trill's wavy line, the octave line runs on for the note's written duration.
	it.concurrent('octave-trill (p. 30): runs the line through a trilled note', async () => {
		expect(await trillReach()).toMatchMeasurements(true);
	});

	// An octave sign over one note takes an end corner.
	it.concurrent('octave-single-note (p. 31): closes a one-note octave sign', async () => {
		expect(await singleNoteCorner()).toMatchMeasurements(true);
	});
});

function bracketIn(e: Engraving, measure: number): Ink {
	return must(
		e.inMeasure('bracket', measure)[0],
		`octave sign in M${measure + 1}`,
	);
}

/** The numeral's extent: the bracket's ink from its left edge to the first column gap. */
function numeral(bracket: Ink): {
	x0: number;
	x1: number;
	top: number;
	bottom: number;
} {
	const columns: [number, number][][] = [];
	let x1 = bracket.box.x;
	for (let x = bracket.box.x; x < bracket.box.x + bracket.box.w; x++) {
		const bands = bracket.bandsAt(x);
		if (bands.length === 0 && columns.length > 0) {
			break;
		}
		if (bands.length > 0) {
			x1 = x + 1;
		}
		columns.push(bands);
	}
	const bands = columns.flat();
	return {
		x0: bracket.box.x,
		x1,
		top: Math.min(...bands.map(([a]) => a)),
		bottom: Math.max(...bands.map(([, b]) => b)),
	};
}

/** The row holding the most separate dashes: the extension line. */
function lineRow(bracket: Ink): number {
	const rows = bracket
		.rowYs()
		.map((y) => ({ y, dashes: bracket.segmentsAt(y).length }));
	return must(rows.sort((a, b) => b.dashes - a.dashes)[0], 'extension line').y;
}

/** How tall the bracket's end corner is at its right edge, in quarter-spaces. */
function cornerHeight(bracket: Ink, e: Engraving): number {
	const right = bracket.box.x + bracket.box.w - 1;
	return quarters(
		bracket.bandsAt(right).reduce((n, b) => n + bandHeight(b), 0),
		e.space(),
	);
}

async function numeralFit() {
	const e = await engrave('octave', 'octave-numeral');
	const n = numeral(bracketIn(e, 0));
	const first = must(e.headsIn(0)[0], 'first note');
	const h = quarters(n.bottom - n.top, e.space());
	const leftOk = n.x0 <= first.head.x;
	const dx = Math.round(n.x0 - first.head.x);
	e.marks.reference('first-note-left', {
		kind: 'line',
		from: { x: first.head.x, y: n.top - 4 },
		to: { x: first.head.x, y: first.head.y + first.head.h },
		label: '',
		note: `M1 first notehead left edge at x=${first.head.x}`,
	});
	e.marks.measure({
		kind: 'bracket',
		from: { x: n.x0 - 6, y: n.top },
		to: { x: n.x0 - 6, y: n.bottom },
		label: formatSpaces(h),
		note: `M1 octave numeral height is ${formatSpaces(h)} spaces (expected 1½)`,
		pass: h === 1.5,
	});
	e.marks.measure({
		kind: 'box',
		from: { x: n.x0 - 1, y: n.top - 1 },
		to: { x: n.x1 + 1, y: n.bottom + 1 },
		label: leftOk ? 'left' : `+${dx}px`,
		note: `M1 octave numeral starts at x=${n.x0} vs first notehead x=${first.head.x} (expected left of notehead)`,
		pass: leftOk,
	});
	return e.check({
		height: h,
		side: leftOk ? 'left of the note' : 'right of its left edge',
	});
}

async function lineEdges() {
	const e = await engrave('octave', 'octave-line-edge');
	const above = bracketIn(e, 0);
	const below = bracketIn(e, 3);
	const aNum = numeral(above);
	const bNum = numeral(below);
	const aRow = lineRow(above);
	const bRow = lineRow(below);
	const aDiff = quarters(Math.abs(aRow - aNum.top), e.space());
	const bDiff = quarters(Math.abs(bRow - (bNum.bottom - 1)), e.space());

	e.marks.reference('above-top', {
		kind: 'line',
		from: { x: aNum.x0 - 2, y: aNum.top },
		to: { x: aNum.x1 + 22, y: aNum.top },
		label: '',
		note: `M1 8va numeral top at y=${aNum.top}`,
	});
	e.marks.measure({
		kind: 'box',
		from: { x: aNum.x1, y: Math.min(aNum.top, aRow) - 2 },
		to: { x: aNum.x1 + 22, y: Math.max(aNum.top, aRow) + 2 },
		label: aDiff === 0 ? '0' : `${formatSpaces(aDiff)} off`,
		note: `M1 8va line at y=${aRow} vs numeral top y=${aNum.top} (${formatSpaces(aDiff)} spaces off, expected 0)`,
		pass: aDiff === 0,
	});

	e.marks.reference('below-base', {
		kind: 'line',
		from: { x: bNum.x0 - 2, y: bNum.bottom - 1 },
		to: { x: bNum.x1 + 22, y: bNum.bottom - 1 },
		label: '',
		note: `M4 8vb numeral base at y=${bNum.bottom - 1}`,
	});
	e.marks.measure({
		kind: 'box',
		from: { x: bNum.x1, y: Math.min(bNum.bottom - 1, bRow) - 2 },
		to: { x: bNum.x1 + 22, y: Math.max(bNum.bottom - 1, bRow) + 2 },
		label: bDiff === 0 ? '0' : `${formatSpaces(bDiff)} off`,
		note: `M4 8vb line at y=${bRow} vs numeral base y=${bNum.bottom - 1} (${formatSpaces(bDiff)} spaces off, expected 0)`,
		pass: bDiff === 0,
	});

	return e.check([aDiff, bDiff]);
}

async function inkUnderOctaveLines() {
	const e = await engrave('octave', 'octave-clear');
	const collisions: string[] = [];
	const brackets = e.of('bracket');
	for (const bracket of brackets) {
		const hits = e.inks.filter(
			(i) =>
				i.kind !== 'bracket' && i.kind !== 'stave' && i.overlaps(bracket) > 0,
		);
		for (const hit of hits) {
			const px = hit.overlaps(bracket);
			collisions.push(`${hit.kind} at x ${hit.box.x}`);
			e.marks.measure({
				kind: 'box',
				from: { x: hit.box.x - 2, y: hit.box.y - 2 },
				to: {
					x: hit.box.x + hit.box.w + 2,
					y: hit.box.y + hit.box.h + 2,
				},
				label: `${hit.kind} (${px}px)`,
				note: `Octave bracket overlaps ${hit.kind} at x=${hit.box.x} by ${px}px (expected 0)`,
				pass: false,
			});
		}
	}
	if (collisions.length === 0) {
		for (const bracket of brackets) {
			e.marks.measure({
				kind: 'box',
				from: { x: bracket.box.x - 1, y: bracket.box.y - 1 },
				to: {
					x: bracket.box.x + bracket.box.w + 1,
					y: bracket.box.y + bracket.box.h + 1,
				},
				label: 'clear',
				note: `Octave bracket at x=${bracket.box.x} clears all other ink`,
				pass: true,
			});
		}
	}
	return e.check(collisions);
}

/** Where M2's line ends past its last head and dot, and its corner. */
async function endCorner() {
	const e = await engrave('octave', 'octave-end-corner');
	const bracket = bracketIn(e, 1);
	const last = must(e.headsIn(1).at(-1), 'dotted half');
	const ink = must(last.ink, 'dotted half ink');
	const dotRight = ink.x + ink.w;
	const bracketRight = bracket.box.x + bracket.box.w;
	const past = quarters(bracketRight - dotRight, e.space());
	const endOk = past >= 0 && past <= 1;
	const ch = cornerHeight(bracket, e);
	const cornerOk = ch >= 0.5;

	e.marks.reference('dot-right', {
		kind: 'line',
		from: { x: dotRight, y: bracket.box.y - 4 },
		to: { x: dotRight, y: ink.y + ink.h },
		label: '',
		note: `M2 dotted half ink right edge at x=${dotRight}`,
	});
	e.marks.measure({
		kind: 'bracket',
		from: { x: Math.min(dotRight, bracketRight), y: bracket.box.y - 18 },
		to: { x: Math.max(dotRight, bracketRight), y: bracket.box.y - 18 },
		label: `${past >= 0 ? '+' : ''}${formatSpaces(past)}`,
		note: `M2 octave line ends ${formatSpaces(past)} spaces past the dot (expected 0 to 1)`,
		pass: endOk,
	});
	e.marks.measure({
		kind: 'box',
		from: { x: bracketRight - 6, y: bracket.box.y - 2 },
		to: { x: bracketRight + 2, y: bracket.box.y + bracket.box.h + 2 },
		label: cornerOk ? `corner ${formatSpaces(ch)}` : 'no corner',
		note: `M2 octave end corner height is ${formatSpaces(ch)} spaces (expected ≥½)`,
		pass: cornerOk,
	});

	return e.check({
		end: endOk ? 'just after the dot' : 'elsewhere',
		corner: cornerOk,
	});
}

async function singleNoteCorner() {
	const e = await engrave('octave', 'octave-single-note');
	const bracket = bracketIn(e, 2);
	const ch = cornerHeight(bracket, e);
	const ok = ch >= 0.5;
	const right = bracket.box.x + bracket.box.w;
	e.marks.measure({
		kind: 'box',
		from: { x: right - 6, y: bracket.box.y - 2 },
		to: { x: right + 2, y: bracket.box.y + bracket.box.h + 2 },
		label: ok ? `corner ${formatSpaces(ch)}` : 'no corner',
		note: `M3 one-note octave sign end corner height is ${formatSpaces(ch)} spaces (expected ≥½)`,
		pass: ok,
	});
	return e.check(ok);
}

async function systemBreak() {
	const e = await engrave('octave', 'octave-system-break');
	const m5 = e.measureRect(4);
	const end = e.inMeasure('bracket', 4);
	const resume = e.inMeasure('bracket', 5);
	const first = must(e.headsIn(5)[0], 'first note of the new system');
	const endsAtBarline =
		end.length > 0 && end.every((b) => b.box.x + b.box.w <= m5.x + m5.w + 1);
	const resumed = resume.filter(
		(b) =>
			b.box.x <= first.head.x + 1 && b.box.x >= first.head.x - 2 * e.space(),
	);

	e.marks.reference('m5-barline', {
		kind: 'line',
		from: { x: m5.x + m5.w, y: (e.lines(4)[0] ?? m5.y) - 4 * e.space() },
		to: { x: m5.x + m5.w, y: e.lines(4).at(-1) ?? m5.y + m5.h },
		label: 'barline',
		note: `M5 system-end barline at x=${m5.x + m5.w}`,
	});
	if (end.length > 0) {
		const b = must(end[0], 'M5 bracket');
		e.marks.measure({
			kind: 'box',
			from: { x: b.box.x - 1, y: b.box.y - 1 },
			to: { x: b.box.x + b.box.w + 1, y: b.box.y + b.box.h + 1 },
			label: endsAtBarline ? 'within barline' : 'past barline',
			note: `M5 octave line ends at x=${b.box.x + b.box.w} vs barline x=${m5.x + m5.w}`,
			pass: endsAtBarline,
		});
	} else {
		const m5Top = (e.lines(4)[0] ?? m5.y) - 3 * e.space();
		e.marks.measure({
			kind: 'box',
			from: { x: m5.x + 4, y: m5Top - e.space() },
			to: { x: m5.x + m5.w - 2, y: m5Top + e.space() },
			label: 'no line to barline',
			note: `M5 has no octave bracket extending to barline x=${m5.x + m5.w}`,
			pass: false,
		});
	}
	const m6Top = (e.lines(5)[0] ?? first.head.y) - 3 * e.space();
	e.marks.measure({
		kind: 'box',
		from: {
			x: resumed[0] ? resumed[0].box.x - 2 : first.head.x - e.space(),
			y: resumed[0] ? resumed[0].box.y - 2 : m6Top - e.space(),
		},
		to: {
			x: resumed[0]
				? resumed[0].box.x + resumed[0].box.w + 2
				: first.head.x + first.head.w + 2,
			y: resumed[0]
				? resumed[0].box.y + resumed[0].box.h + 2
				: m6Top + e.space(),
		},
		label: resumed.length === 1 ? 'resumes' : `${resumed.length} resumed`,
		note: `M6 system start has ${resumed.length} octave bracket(s) before first note (expected 1)`,
		pass: resumed.length === 1,
	});

	return e.check({
		endsAtBarline,
		resumes: resumed.length,
	});
}

async function aboveTuplets() {
	const e = await engrave('octave', 'octave-longest-outside');
	const bracket = bracketIn(e, 6);
	const tuplets = e.inMeasure('tuplet', 6);
	const allBelow = tuplets.every(
		(t) => bracket.box.y + bracket.box.h <= t.box.y + 1,
	);
	e.marks.reference('m7-octave', {
		kind: 'box',
		from: { x: bracket.box.x - 1, y: bracket.box.y - 1 },
		to: {
			x: bracket.box.x + bracket.box.w + 1,
			y: bracket.box.y + bracket.box.h + 1,
		},
		label: '8va',
		note: `M7 octave bracket spans y=${bracket.box.y}..${bracket.box.y + bracket.box.h}`,
	});
	tuplets.forEach((t, i) => {
		const below = bracket.box.y + bracket.box.h <= t.box.y + 1;
		e.marks.measure({
			kind: 'box',
			from: { x: t.box.x - 1, y: t.box.y - 1 },
			to: { x: t.box.x + t.box.w + 1, y: t.box.y + t.box.h + 1 },
			label: below ? 'inside' : 'outside',
			note: `M7 tuplet ${i + 1} top y=${t.box.y} vs octave bottom y=${bracket.box.y + bracket.box.h} (expected inside octave line)`,
			pass: below,
		});
	});
	return e.check({
		hasTuplets: tuplets.length > 0,
		allBelow,
	});
}

async function trillReach() {
	const e = await engrave('octave', 'octave-trill');
	const bracket = bracketIn(e, 7);
	const next = must(e.headsIn(7).at(-1), 'note after the trill');
	const endX = bracket.box.x + bracket.box.w;
	const ok = endX >= next.head.x - 1.5 * e.space();
	const gap = quarters(next.head.x - endX, e.space());
	e.marks.reference('after-trill', {
		kind: 'line',
		from: { x: next.head.x, y: bracket.box.y - 4 },
		to: { x: next.head.x, y: next.head.y + next.head.h },
		label: '',
		note: `M8 note after trill at x=${next.head.x}`,
	});
	e.marks.measure({
		kind: 'bracket',
		from: { x: bracket.box.x, y: bracket.box.y - 6 },
		to: { x: endX, y: bracket.box.y - 6 },
		label: ok ? 'through trill' : `short (${formatSpaces(gap)})`,
		note: `M8 octave line ends ${formatSpaces(gap)} spaces before next note (expected ≤1½)`,
		pass: ok,
	});
	return e.check(ok);
}
