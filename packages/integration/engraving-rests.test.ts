import { describe, expect, it } from 'bun:test';
import { formatSpaces } from './engraving-marks';
import type { EngravedNote, Engraving } from './engraving-model';
import { draw, engrave, must, quarters } from './engraving-render';

// Behind Bars, pp. 34–37: rests (ENGRAVING.md). rests.musicxml, treble:
// - M1: whole rest. M2: two half rests. M3 (8/4): breve rest. M4 (4/4): quarter rests.
// - M5: eighth, sixteenth, 32nd and 64th rests. M6: eighth and sixteenth rests between
//   C6 and A3. M7: rests inside beamed groups of low notes.
// rests-voices.musicxml, treble, 4/4, two voices:
// - M1: V1 C5 rest C5-half over V2 rest E4 half-rest.
// - M2: V1 half-rest C5-half over V2 E4 E4 half-rest. M3: V1 half-rest C5-half over V2
//   eighth-rest E4s (simultaneous rests of different durations).
// - M4: V1 C5 sixteenth, sixteenth and eighth rests (one beat), over V2 E4 whole.
// - M5: V1 quarter rest over V2's C5, then C6. M6: one voice, the rests alone, for their
//   default places. M7: V1 half rest while V2 holds A5, so the rest leaves the stave.
// Rest positions are measured from the stave's top line, in quarter-spaces.

describe('Behind Bars rests (pp. 34–37)', () => {
	it.concurrent('draws rests', async () => {
		expect(await draw('rests')).toMatchScreenshot('engraving_rests.png');
	});

	it.concurrent('draws rests-voices', async () => {
		expect(await draw('rests-voices')).toMatchScreenshot(
			'engraving_rests-voices.png',
		);
	});

	// A whole rest hangs from the second line down; a half rest sits on the middle line.
	it.concurrent('rest-whole-half (p. 34): hangs the whole rest and sits the half rest', async () => {
		expect(await wholeAndHalfRest()).toMatchMeasurements([1, 2]);
	});

	// A breve rest fills the space above the middle line.
	it.concurrent('rest-breve (p. 35): fills the space above the middle line', async () => {
		expect(await breveRest()).toMatchMeasurements({ top: 1, bottom: 2 });
	});

	// A quarter rest starts in the top space and ends in the bottom one.
	it.concurrent('rest-quarter (p. 35): spans the top space to the bottom one', async () => {
		expect(await quarterRest()).toMatchMeasurements({
			inTopSpace: true,
			inBottomSpace: true,
		});
	});

	// Shorter rests keep each hook in a space: the eighth and sixteenth start in the second
	// space, the 32nd and 64th in the top one.
	it.concurrent('rest-short (p. 35): places each hook of shorter rests in a space', async () => {
		expect(await shortRests()).toMatchMeasurements([1, 1, 0, 0]);
	});

	// Rests stay centred in the stave whatever the pitches around them.
	it.concurrent('rest-centred (p. 35): keeps rests in place between high and low notes', async () => {
		expect(await centredRests()).toMatchMeasurements([0, 0, 0, 0, 0]);
	});

	// The beam keeps its place; a rest under it moves to clear it.
	it.concurrent('rest-beam (p. 36): moves rests clear of a beam', async () => {
		expect(await restsUnderBeams()).toMatchMeasurements(0);
	});

	// With two parts, upper rests go above the middle line, lower rests below.
	it.concurrent('rest-voices-sides (p. 36): puts each part’s rests on its side', async () => {
		expect(await voiceSides()).toMatchMeasurements({
			upper: ['above'],
			lower: ['below', 'below'],
		});
	});

	// Whole and half rests in two-part writing never stray across the middle line.
	it.concurrent('rest-voices-half (p. 36): keeps half rests on their side', async () => {
		expect(await halfRestSides()).toMatchMeasurements([true, true]);
	});

	// When both parts rest at once, at least one stave line separates their rests.
	it.concurrent('rest-voices-simultaneous (p. 36): separates simultaneous rests', async () => {
		expect(await simultaneousRests()).toMatchMeasurements({
			separated: true,
		});
	});

	// A rest moved off its place moves by whole stave-spaces.
	it.concurrent('rest-whole-spaces (p. 35): moves displaced rests by whole spaces', async () => {
		expect(await wholeSpaceMoves()).toMatchMeasurements([]);
	});

	// Rests within one beat line up at the same height.
	it.concurrent('rest-beat-align (p. 37): moves the rests of a beat together', async () => {
		expect(await beatAlignedRests()).toMatchMeasurements(1);
	});

	// A rest the other part's note would hit moves further from the stave, clear of it.
	it.concurrent('rest-displaced-outward (p. 37): moves a rest clear of the other part', async () => {
		expect(await restAboveOtherPart()).toMatchMeasurements(true);
	});

	// A half or whole rest moved outside the stave sits on a ledger line.
	it.concurrent('rest-outside-ledger (p. 37): gives a raised half rest its ledger line', async () => {
		expect(await raisedHalfRest()).toMatchMeasurements({
			outside: true,
			onLedger: true,
		});
	});
});

const fromTop = (e: Engraving, m: number, y: number) =>
	quarters(y - (e.lines(m)[0] ?? 0), e.space());

function lineSpan(e: Engraving, measure: number) {
	const rect = e.measureRect(measure);
	return { left: rect.x, right: rect.x + rect.w };
}

async function wholeAndHalfRest() {
	const e = await engrave('rests', 'rest-whole-half');
	const whole = must(e.restsIn(0)[0], 'whole rest in M1');
	const half = must(e.restsIn(1)[0], 'half rest in M2');
	const wholeTop = fromTop(e, 0, whole.head.y);
	const halfBottom = fromTop(e, 1, half.head.y + half.head.h);
	const m1Span = lineSpan(e, 0);
	const m2Span = lineSpan(e, 1);
	const secondLine = must(e.lines(0)[1], 'M1 second line');
	const middleLine = must(e.lines(1)[2], 'M2 middle line');

	e.marks.reference('m1-second-line', {
		kind: 'line',
		from: { x: m1Span.left, y: secondLine },
		to: { x: m1Span.right, y: secondLine },
		label: '2nd line',
		note: `M1 second stave line at y=${secondLine}`,
	});
	e.marks.measure({
		kind: 'box',
		from: { x: whole.head.x - 2, y: whole.head.y - 2 },
		to: {
			x: whole.head.x + whole.head.w + 2,
			y: whole.head.y + whole.head.h + 2,
		},
		label: `top ${formatSpaces(wholeTop)}`,
		note: `M1 whole rest top is ${formatSpaces(wholeTop)} spaces from top line (expected 1)`,
		pass: wholeTop === 1,
	});
	e.marks.reference('m2-middle-line', {
		kind: 'line',
		from: { x: m2Span.left, y: middleLine },
		to: { x: m2Span.right, y: middleLine },
		label: 'middle line',
		note: `M2 middle stave line at y=${middleLine}`,
	});
	e.marks.measure({
		kind: 'box',
		from: { x: half.head.x - 2, y: half.head.y - 2 },
		to: {
			x: half.head.x + half.head.w + 2,
			y: half.head.y + half.head.h + 2,
		},
		label: `bot ${formatSpaces(halfBottom)}`,
		note: `M2 half rest bottom is ${formatSpaces(halfBottom)} spaces from top line (expected 2)`,
		pass: halfBottom === 2,
	});

	return e.check([wholeTop, halfBottom]);
}

async function breveRest() {
	const e = await engrave('rests', 'rest-breve');
	const rest = must(e.restsIn(2)[0], 'breve rest in M3');
	const top = fromTop(e, 2, rest.head.y);
	const bottom = fromTop(e, 2, rest.head.y + rest.head.h);
	const span = lineSpan(e, 2);
	const line2 = must(e.lines(2)[1], 'M3 second line');
	const line3 = must(e.lines(2)[2], 'M3 middle line');
	const ok = top === 1 && bottom === 2;

	e.marks.reference('m3-line2', {
		kind: 'line',
		from: { x: span.left, y: line2 },
		to: { x: span.right, y: line2 },
		label: '',
		note: `M3 second stave line at y=${line2}`,
	});
	e.marks.reference('m3-line3', {
		kind: 'line',
		from: { x: span.left, y: line3 },
		to: { x: span.right, y: line3 },
		label: '',
		note: `M3 middle stave line at y=${line3}`,
	});
	e.marks.measure({
		kind: 'bracket',
		from: { x: rest.head.x + rest.head.w + 6, y: rest.head.y },
		to: { x: rest.head.x + rest.head.w + 6, y: rest.head.y + rest.head.h },
		label: `${formatSpaces(top)}..${formatSpaces(bottom)}`,
		note: `M3 breve rest spans ${formatSpaces(top)} to ${formatSpaces(bottom)} spaces from top line (expected 1 to 2)`,
		pass: ok,
	});

	return e.check({ top, bottom });
}

async function quarterRest() {
	const e = await engrave('rests', 'rest-quarter');
	const rest = must(e.restsIn(3)[0], 'quarter rest in M4');
	const top = fromTop(e, 3, rest.head.y);
	const bottom = fromTop(e, 3, rest.head.y + rest.head.h);
	const inTopSpace = top >= 0 && top <= 1;
	const inBottomSpace = bottom >= 3 && bottom <= 4;
	const span = lineSpan(e, 3);
	const lines = e.lines(3);

	e.marks.reference('m4-top', {
		kind: 'line',
		from: { x: span.left, y: must(lines[0], 'M4 top line') },
		to: { x: span.right, y: must(lines[0], 'M4 top line') },
		label: '',
		note: 'M4 top stave line',
	});
	e.marks.reference('m4-bottom', {
		kind: 'line',
		from: { x: span.left, y: must(lines[4], 'M4 bottom line') },
		to: { x: span.right, y: must(lines[4], 'M4 bottom line') },
		label: '',
		note: 'M4 bottom stave line',
	});
	e.marks.measure({
		kind: 'bracket',
		from: { x: rest.head.x + rest.head.w + 6, y: rest.head.y },
		to: { x: rest.head.x + rest.head.w + 6, y: rest.head.y + rest.head.h },
		label: `${formatSpaces(top)}..${formatSpaces(bottom)}`,
		note: `M4 quarter rest spans ${formatSpaces(top)} to ${formatSpaces(bottom)} spaces from top line (expected 0..1 to 3..4)`,
		pass: inTopSpace && inBottomSpace,
	});

	return e.check({ inTopSpace, inBottomSpace });
}

async function shortRests() {
	const e = await engrave('rests', 'rest-short');
	const rests = e.restsIn(4).slice(0, 4);
	const expected = [1, 1, 0, 0];
	const names = ['8th', '16th', '32nd', '64th'];
	const spaces = rests.map((r, i) => {
		const top = fromTop(e, 4, r.head.y);
		const sp = Math.floor(top);
		const want = expected[i] ?? 0;
		e.marks.measure({
			kind: 'box',
			from: { x: r.head.x - 1, y: r.head.y - 1 },
			to: { x: r.head.x + r.head.w + 1, y: r.head.y + r.head.h + 1 },
			label: `sp ${sp + 1}`,
			note: `M5 ${names[i]} rest starts at ${formatSpaces(top)} spaces (space ${sp + 1}, expected space ${want + 1})`,
			pass: sp === want,
		});
		return sp;
	});
	return e.check(spaces);
}

async function centredRests() {
	const e = await engrave('rests', 'rest-centred');
	const m5 = e.restsIn(4);
	const m6 = e.restsIn(5);
	const home = (beats: number | undefined) =>
		fromTop(
			e,
			4,
			must(
				m5.find((r) => r.beats === beats),
				`M5 ${beats}-beat rest`,
			).head.y,
		);
	const span = lineSpan(e, 5);
	const mid = e.middle(5);
	e.marks.reference('m6-middle', {
		kind: 'line',
		from: { x: span.left, y: mid },
		to: { x: span.right, y: mid },
		label: 'middle line',
		note: `M6 middle stave line at y=${mid}`,
	});
	const diffs = m6.map((r, i) => {
		const top = fromTop(e, 5, r.head.y);
		const expected = home(r.beats);
		const diff = quarters((top - expected) * e.space(), e.space());
		e.marks.measure({
			kind: 'box',
			from: { x: r.head.x - 1, y: r.head.y - 1 },
			to: { x: r.head.x + r.head.w + 1, y: r.head.y + r.head.h + 1 },
			label: diff === 0 ? '0' : `${diff > 0 ? '+' : ''}${formatSpaces(diff)}`,
			note: `M6 rest ${i + 1} (${r.beats}b) top is ${formatSpaces(top)} vs M5 home ${formatSpaces(expected)} (diff ${formatSpaces(diff)})`,
			pass: diff === 0,
		});
		return diff;
	});
	return e.check(diffs);
}

/** Pixels where M7's rests and beams overlap. */
async function restsUnderBeams() {
	const e = await engrave('rests', 'rest-beam');
	const beams = e.inMeasure('beam', 6);
	const rests = e.inMeasure('rest', 6);
	let total = 0;
	for (const r of rests) {
		const px = beams.reduce((m, b) => m + r.overlaps(b), 0);
		total += px;
		if (px > 0) {
			e.marks.measure({
				kind: 'box',
				from: { x: r.box.x - 2, y: r.box.y - 2 },
				to: { x: r.box.x + r.box.w + 2, y: r.box.y + r.box.h + 2 },
				label: `${px}px`,
				note: `M7 rest at x=${r.box.x} overlaps beam by ${px}px (expected 0)`,
				pass: false,
			});
		}
	}
	if (total === 0) {
		for (const r of rests) {
			e.marks.measure({
				kind: 'box',
				from: { x: r.box.x - 1, y: r.box.y - 1 },
				to: { x: r.box.x + r.box.w + 1, y: r.box.y + r.box.h + 1 },
				label: 'clear',
				note: `M7 rest at x=${r.box.x} clears all beams`,
				pass: true,
			});
		}
	}
	return e.check(total);
}

const side = (r: EngravedNote, middle: number) =>
	r.cy < middle ? 'above' : 'below';

async function voiceSides() {
	const e = await engrave('rests-voices', 'rest-voices-sides');
	const middle = e.middle(0);
	const span = lineSpan(e, 0);
	e.marks.reference('m1-middle', {
		kind: 'line',
		from: { x: span.left, y: middle },
		to: { x: span.right, y: middle },
		label: 'middle line',
		note: `M1 middle stave line at y=${middle}`,
	});
	const upper = e.restsIn(0, { voice: '1' }).map((r) => {
		const s = side(r, middle);
		e.marks.measure({
			kind: 'box',
			from: { x: r.head.x - 1, y: r.head.y - 1 },
			to: { x: r.head.x + r.head.w + 1, y: r.head.y + r.head.h + 1 },
			label: `V1 ${s}`,
			note: `M1 V1 rest centre y=${Math.round(r.cy)} vs middle y=${middle} (${s}, expected above)`,
			pass: s === 'above',
		});
		return s;
	});
	const lower = e.restsIn(0, { voice: '2' }).map((r) => {
		const s = side(r, middle);
		e.marks.measure({
			kind: 'box',
			from: { x: r.head.x - 1, y: r.head.y - 1 },
			to: { x: r.head.x + r.head.w + 1, y: r.head.y + r.head.h + 1 },
			label: `V2 ${s}`,
			note: `M1 V2 rest centre y=${Math.round(r.cy)} vs middle y=${middle} (${s}, expected below)`,
			pass: s === 'below',
		});
		return s;
	});
	return e.check({ upper, lower });
}

/** Whether each voice's half rest in M2 stays on its own side of the middle line. */
async function halfRestSides() {
	const e = await engrave('rests-voices', 'rest-voices-half');
	const middle = e.middle(1);
	const span = lineSpan(e, 1);
	const upper = must(e.restsIn(1, { voice: '1' })[0], 'upper half rest');
	const lower = must(e.restsIn(1, { voice: '2' })[0], 'lower half rest');
	const upperOk = upper.head.y + upper.head.h <= middle + 1;
	const lowerOk = lower.head.y >= middle - 1;

	e.marks.reference('m2-middle', {
		kind: 'line',
		from: { x: span.left, y: middle },
		to: { x: span.right, y: middle },
		label: 'middle line',
		note: `M2 middle stave line at y=${middle}`,
	});
	e.marks.measure({
		kind: 'box',
		from: { x: upper.head.x - 2, y: upper.head.y - 2 },
		to: {
			x: upper.head.x + upper.head.w + 2,
			y: upper.head.y + upper.head.h + 2,
		},
		label: upperOk ? 'V1 above' : 'V1 crosses',
		note: `M2 V1 half rest bottom y=${Math.round(upper.head.y + upper.head.h)} vs middle y=${middle}`,
		pass: upperOk,
	});
	e.marks.measure({
		kind: 'box',
		from: { x: lower.head.x - 2, y: lower.head.y - 2 },
		to: {
			x: lower.head.x + lower.head.w + 2,
			y: lower.head.y + lower.head.h + 2,
		},
		label: lowerOk ? 'V2 below' : 'V2 crosses',
		note: `M2 V2 half rest top y=${Math.round(lower.head.y)} vs middle y=${middle}`,
		pass: lowerOk,
	});

	return e.check([upperOk, lowerOk]);
}

/** Stave lines between the two voices' simultaneous rests in M3. */
async function simultaneousRests() {
	const e = await engrave('rests-voices', 'rest-voices-simultaneous');
	const upper = must(e.restsIn(2, { voice: '1' })[0], 'upper rest');
	const lower = must(e.restsIn(2, { voice: '2' })[0], 'lower rest');
	const between = e
		.lines(2)
		.filter((y) => y >= upper.head.y + upper.head.h && y <= lower.head.y);
	const separated = between.length >= 1;
	const span = lineSpan(e, 2);
	for (const lineY of between) {
		e.marks.reference(`m3-line-${lineY}`, {
			kind: 'line',
			from: { x: span.left, y: lineY },
			to: { x: span.right, y: lineY },
			label: '',
			note: `M3 separating stave line at y=${lineY}`,
		});
	}
	e.marks.measure({
		kind: 'bracket',
		from: {
			x: Math.max(upper.head.x + upper.head.w, lower.head.x + lower.head.w) + 6,
			y: upper.head.y + upper.head.h,
		},
		to: {
			x: Math.max(upper.head.x + upper.head.w, lower.head.x + lower.head.w) + 6,
			y: lower.head.y,
		},
		label: `${between.length} line${between.length === 1 ? '' : 's'}`,
		note: `M3 simultaneous rests have ${between.length} stave line(s) between them (expected ≥1)`,
		pass: separated,
	});
	return e.check({ separated });
}

/** How far each two-voice rest moved from its one-voice place (M6), in quarter-spaces. */
async function wholeSpaceMoves() {
	const e = await engrave('rests-voices', 'rest-whole-spaces');
	const home = (beats: number | undefined) =>
		must(
			e.restsIn(5).find((r) => r.beats === beats),
			`${beats}-beat rest alone`,
		).head.y;
	const nonWhole: number[] = [];
	for (const m of [0, 1, 2, 3, 4]) {
		for (const r of e.restsIn(m)) {
			const move = quarters(r.head.y - home(r.beats), e.space());
			const whole = Number.isInteger(move);
			if (!whole) {
				nonWhole.push(move);
			}
			e.marks.measure({
				kind: 'box',
				from: { x: r.head.x - 1, y: r.head.y - 1 },
				to: { x: r.head.x + r.head.w + 1, y: r.head.y + r.head.h + 1 },
				label: `${move > 0 ? '+' : ''}${formatSpaces(move)}`,
				note: `M${m + 1} V${r.voice} rest moved ${formatSpaces(move)} spaces from M6 home (expected whole integer)`,
				pass: whole,
			});
		}
	}
	return e.check(nonWhole);
}

async function beatAlignedRests() {
	const e = await engrave('rests-voices', 'rest-beat-align');
	const home = (beats: number | undefined) =>
		must(
			e.restsIn(5).find((r) => r.beats === beats),
			`${beats}-beat rest alone`,
		).head.y;
	const rests = e.restsIn(3, { voice: '1' });
	const moves = rests.map((r) => quarters(r.head.y - home(r.beats), e.space()));
	const unique = new Set(moves).size;
	const ok = unique === 1;
	rests.forEach((r, i) => {
		const move = moves[i] ?? 0;
		e.marks.measure({
			kind: 'box',
			from: { x: r.head.x - 1, y: r.head.y - 1 },
			to: { x: r.head.x + r.head.w + 1, y: r.head.y + r.head.h + 1 },
			label: `${move > 0 ? '+' : ''}${formatSpaces(move)}`,
			note: `M4 V1 rest ${i + 1} displaced ${formatSpaces(move)} spaces from home`,
			pass: ok,
		});
	});
	return e.check(unique);
}

async function restAboveOtherPart() {
	const e = await engrave('rests-voices', 'rest-displaced-outward');
	const rest = must(e.restsIn(4, { voice: '1' })[0], 'upper rest');
	const c5 = must(e.headsIn(4, { voice: '2' })[0], 'lower C5');
	const ok = rest.head.y + rest.head.h <= c5.head.y + 1;
	e.marks.reference('m5-c5-top', {
		kind: 'line',
		from: { x: c5.head.x - 4, y: c5.head.y },
		to: { x: c5.head.x + c5.head.w + 4, y: c5.head.y },
		label: '',
		note: `M5 V2 C5 notehead top at y=${c5.head.y}`,
	});
	e.marks.measure({
		kind: 'box',
		from: { x: rest.head.x - 2, y: rest.head.y - 2 },
		to: {
			x: rest.head.x + rest.head.w + 2,
			y: rest.head.y + rest.head.h + 2,
		},
		label: ok ? 'clear' : 'clashes',
		note: `M5 V1 quarter rest bottom y=${Math.round(rest.head.y + rest.head.h)} vs V2 C5 top y=${Math.round(c5.head.y)}`,
		pass: ok,
	});
	return e.check(ok);
}

/** Whether M7's raised half rest is outside the stave, and on a ledger line. */
async function raisedHalfRest() {
	const e = await engrave('rests-voices', 'rest-outside-ledger');
	const rest = must(e.restsIn(6, { voice: '1' })[0], 'raised half rest');
	const topLine = must(e.lines(6)[0], 'M7 top line');
	const outside = rest.head.y + rest.head.h < topLine - 1;
	const bottom = Math.round(rest.head.y + rest.head.h);
	const rows = [bottom - 1, bottom, bottom + 1];
	const externalLedger = e.inks
		.filter((i) => i.kind !== 'rest')
		.some((i) =>
			rows.some((y) =>
				i
					.segmentsAt(y)
					.some(([a, b]) => a <= rest.head.x && b >= rest.head.x + rest.head.w),
			),
		);
	// VexFlow 5.9.0 draws an outside half rest with the SMuFL `restHalfLegerLine` glyph,
	// whose bottom edge includes a ledger line extending wider than the rest body above it.
	const restInk = e
		.inMeasure('rest', 6)
		.find(
			(i) =>
				Math.abs(i.box.x + i.box.w / 2 - (rest.head.x + rest.head.w / 2)) <
				e.space(),
		);
	let glyphLedger = false;
	if (restInk) {
		const midY = Math.round(restInk.box.y + restInk.box.h / 2);
		const body = restInk.segmentsAt(midY)[0];
		const baseRow = restInk.box.y + restInk.box.h - 1;
		const baseSegs = [baseRow - 1, baseRow].flatMap((y) =>
			restInk.segmentsAt(y),
		);
		if (body) {
			glyphLedger = baseSegs.some(
				([a, b]) => a < body[0] - 1 && b > body[1] + 1,
			);
		}
	}
	const onLedger = externalLedger || glyphLedger;
	const span = lineSpan(e, 6);
	e.marks.reference('m7-top-line', {
		kind: 'line',
		from: { x: span.left, y: topLine },
		to: { x: span.right, y: topLine },
		label: 'top line',
		note: `M7 top stave line at y=${topLine}`,
	});
	let label = 'no ledger';
	if (!outside) {
		label = 'inside';
	} else if (onLedger) {
		label = 'ledger';
	}
	e.marks.measure({
		kind: 'box',
		from: {
			x: (restInk?.box.x ?? rest.head.x) - 2,
			y: (restInk?.box.y ?? rest.head.y) - 2,
		},
		to: {
			x:
				(restInk ? restInk.box.x + restInk.box.w : rest.head.x + rest.head.w) +
				2,
			y:
				(restInk ? restInk.box.y + restInk.box.h : rest.head.y + rest.head.h) +
				2,
		},
		label,
		note: `M7 raised half rest outside=${outside}, ledger=${onLedger}`,
		pass: outside && onLedger,
	});
	return e.check({ outside, onLedger });
}
