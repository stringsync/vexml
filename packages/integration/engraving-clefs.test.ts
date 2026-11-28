import { describe, expect, it } from 'bun:test';
import type { Ink } from './engraving-ink';
import { formatSpaces } from './engraving-marks';
import { draw, engrave, must, quarters } from './engraving-render';

// Behind Bars, pp. 5–9: clefs (ENGRAVING.md). Each test is one ledger rule, named by its id
// and print page. clefs.musicxml is a treble stave in 4/4, quarters throughout:
// - M1: treble clef (opening). M2: alto clef from the barline. M3: tenor clef from the
//   barline. M4: treble clef after beat 2. M5: forced onto a new system with a bass clef.
// clef-percussion.musicxml: P1 a five-line stave, P2 a one-line stave, each with a
// percussion clef and four quarters.

describe('Behind Bars clefs (pp. 5–9)', () => {
	it.concurrent('draws clefs', async () => {
		expect(await draw('clefs')).toMatchScreenshot('engraving_clefs.png');
	});

	it.concurrent('draws clef-percussion', async () => {
		expect(await draw('clef-percussion')).toMatchScreenshot(
			'engraving_clef-percussion.png',
		);
	});

	// A C clef centres on the line it makes middle C: alto the middle line, tenor the fourth.
	it.concurrent('clef-c-centred (p. 6): centres alto and tenor clefs on their lines', async () => {
		expect(await cClefOffsets()).toMatchMeasurements([0, 0]);
	});

	// The opening clef stands in from the stave's start by a stave-space or a little less.
	it.concurrent('clef-indent (p. 6): indents the opening clef by at most a space', async () => {
		expect(await openingIndent()).toMatchMeasurements(true);
	});

	// Every stave (bar percussion) begins with a clef, on every system.
	it.concurrent('clef-every-system (p. 7): opens the second system with its clef', async () => {
		expect(await secondSystemOpensWithClef()).toMatchMeasurements(true);
	});

	// A clef change after a system's start is about two-thirds the opening clef's size.
	it.concurrent('clef-change-smaller (p. 7): draws a mid-system clef at two-thirds size', async () => {
		expect(await midSystemClefRatio()).toMatchMeasurements(true);
	});

	// A clef change at the start of a bar goes before the barline.
	it.concurrent('clef-change-before-barline (p. 8): puts barline clef changes before it', async () => {
		expect(await barlineClefSides()).toMatchMeasurements([
			'before the barline',
			'before the barline',
		]);
	});

	// A clef change at a system's start is warned of at the end of the system before.
	it.concurrent('clef-courtesy-system-end (p. 7): warns of the next system’s clef', async () => {
		expect(await courtesyClefs()).toMatchMeasurements(1);
	});

	// The percussion clef fills the middle two spaces; on fewer lines it centres on the line.
	it.concurrent('clef-percussion-centred (p. 6): centres percussion clefs on any stave', async () => {
		expect(await percussionClefs()).toMatchMeasurements({
			fiveLine: 0,
			inMiddleSpaces: true,
			oneLine: 0,
		});
	});
});

const centreY = (ink: Ink) => ink.box.y + ink.box.h / 2;

/** The clefs of a system, left to right: those near the staves of the given measure. */
async function clefsOf(systemMeasure: number, rule: string) {
	const e = await engrave('clefs', rule);
	const lines = e.lines(systemMeasure);
	const near = (ink: Ink) =>
		ink.box.y < (lines[4] ?? 0) + 40 &&
		ink.box.y + ink.box.h > (lines[0] ?? 0) - 40;
	const clefs = e
		.of('clef')
		.filter(near)
		.sort((a, b) => a.box.x - b.box.x);
	return { e, clefs };
}

/** How far the alto and tenor clefs' centres sit from their lines, in quarter-spaces. */
async function cClefOffsets() {
	const { e, clefs } = await clefsOf(0, 'clef-c-centred');
	const alto = must(clefs[1], 'alto clef');
	const tenor = must(clefs[2], 'tenor clef');
	const altoLine = e.lines(1)[2] ?? 0;
	const tenorLine = e.lines(2)[1] ?? 0;
	const altoOffset = quarters(Math.abs(centreY(alto) - altoLine), e.space(1));
	const tenorOffset = quarters(
		Math.abs(centreY(tenor) - tenorLine),
		e.space(2),
	);

	const m2 = e.measureRect(1);
	const m3 = e.measureRect(2);
	e.marks.reference('alto-line', {
		kind: 'line',
		from: { x: m2.x, y: altoLine },
		to: { x: m2.x + m2.w, y: altoLine },
		label: 'middle C',
		note: 'Middle stave line (alto clef centre)',
	});
	e.marks.reference('tenor-line', {
		kind: 'line',
		from: { x: m3.x, y: tenorLine },
		to: { x: m3.x + m3.w, y: tenorLine },
		label: 'middle C',
		note: 'Fourth stave line (tenor clef centre)',
	});
	e.marks.measure({
		kind: 'box',
		from: { x: alto.box.x, y: alto.box.y },
		to: { x: alto.box.x + alto.box.w, y: alto.box.y + alto.box.h },
		label: formatSpaces(altoOffset),
		note: `alto clef centre is ${formatSpaces(altoOffset)} spaces from middle line`,
	});
	e.marks.measure({
		kind: 'box',
		from: { x: tenor.box.x, y: tenor.box.y },
		to: { x: tenor.box.x + tenor.box.w, y: tenor.box.y + tenor.box.h },
		label: formatSpaces(tenorOffset),
		note: `tenor clef centre is ${formatSpaces(tenorOffset)} spaces from fourth line`,
	});
	return e.check([altoOffset, tenorOffset]);
}

/** How far the opening clef stands in from the stave's start, in quarter-spaces. */
async function openingIndent() {
	const { e, clefs } = await clefsOf(0, 'clef-indent');
	const opening = must(clefs[0], 'opening clef');
	const stave = must(
		e.of('stave').sort((a, b) => a.box.x - b.box.x)[0],
		'stave',
	);
	const lines = e.lines(0);
	const indent = quarters(opening.box.x - stave.box.x, e.space(0));
	const ok = indent > 0.25 && indent <= 1;

	const bracketY = opening.box.y - 6;
	e.marks.reference('stave-start', {
		kind: 'line',
		from: { x: stave.box.x, y: bracketY },
		to: { x: stave.box.x, y: (lines[4] ?? 0) + 6 },
		label: '',
		note: 'Stave start',
	});
	e.marks.measure({
		kind: 'bracket',
		from: { x: stave.box.x, y: bracketY },
		to: { x: opening.box.x, y: bracketY },
		label: formatSpaces(indent),
		note: `opening clef indent: ${formatSpaces(indent)} spaces from stave start (expected > ¼ and ≤ 1)`,
		pass: ok,
	});
	return e.check(ok);
}

async function secondSystemOpensWithClef() {
	const { e, clefs } = await clefsOf(4, 'clef-every-system');
	const start = e.measureRect(4).x;
	const lines = e.lines(4);
	const opening = clefs.find((c) => c.box.x - start < 3 * e.space(4));

	e.marks.reference('system-2-start', {
		kind: 'line',
		from: { x: start, y: (lines[0] ?? 0) - 6 },
		to: { x: start, y: (lines[4] ?? 0) + 6 },
		label: '',
		note: 'System 2 stave start',
	});
	if (opening) {
		const offset = quarters(opening.box.x - start, e.space(4));
		e.marks.measure({
			kind: 'box',
			from: { x: opening.box.x, y: opening.box.y },
			to: {
				x: opening.box.x + opening.box.w,
				y: opening.box.y + opening.box.h,
			},
			label: 'opening clef',
			note: `system 2 opens with a clef ${formatSpaces(offset)} spaces from stave start`,
		});
	}
	return e.check(opening !== undefined);
}

async function midSystemClefRatio() {
	const { e, clefs } = await clefsOf(0, 'clef-change-smaller');
	const opening = must(clefs[0], 'opening clef');
	const mid = must(clefs[3], 'mid-measure treble clef');
	const ratio = Math.round((mid.box.h / opening.box.h) * 100) / 100;
	const ok = ratio >= 0.6 && ratio <= 0.75;
	const openingH = quarters(opening.box.h, e.space(0));
	const midH = quarters(mid.box.h, e.space(3));

	e.marks.reference('opening-clef-height', {
		kind: 'bracket',
		from: { x: opening.box.x - 6, y: opening.box.y },
		to: { x: opening.box.x - 6, y: opening.box.y + opening.box.h },
		label: formatSpaces(openingH),
		note: `opening treble clef height: ${formatSpaces(openingH)} spaces`,
	});
	e.marks.measure({
		kind: 'bracket',
		from: { x: mid.box.x - 6, y: mid.box.y },
		to: { x: mid.box.x - 6, y: mid.box.y + mid.box.h },
		label: `${ratio}×`,
		note: `mid-measure treble clef height: ${formatSpaces(midH)} spaces (${ratio}× opening, expected 0.6–0.75×)`,
		pass: ok,
	});
	return e.check(ok);
}

/** Where the alto and tenor clef changes stand against their measure's opening barline. */
async function barlineClefSides() {
	const { e, clefs } = await clefsOf(0, 'clef-change-before-barline');
	const lines = e.lines(0);
	const sides = [1, 2].map((m) => {
		const clef = must(clefs[m], 'C clef');
		const barlineX = e.measureRect(m).x;
		const before = clef.box.x + clef.box.w <= barlineX + 1;
		const side = before ? 'before the barline' : 'after the barline';
		e.marks.reference(`barline-${m}`, {
			kind: 'line',
			from: { x: barlineX, y: (lines[0] ?? 0) - 6 },
			to: { x: barlineX, y: (lines[4] ?? 0) + 6 },
			label: '',
			note: `Bar ${m + 1} opening barline`,
		});
		e.marks.measure({
			kind: 'box',
			from: { x: clef.box.x, y: clef.box.y },
			to: { x: clef.box.x + clef.box.w, y: clef.box.y + clef.box.h },
			label: before ? 'before' : 'after',
			note: `bar ${m + 1} clef change is ${side}`,
		});
		return side;
	});
	return e.check(sides);
}

/** Clefs drawn after M4's last note and before its closing barline. */
async function courtesyClefs() {
	const { e, clefs } = await clefsOf(0, 'clef-courtesy-system-end');
	const m4 = e.measureRect(3);
	const lines = e.lines(3);
	const lastHead = must(e.headsIn(3).at(-1), 'last note of M4');
	const found = clefs.filter(
		(c) => c.box.x > lastHead.head.x && c.box.x + c.box.w <= m4.x + m4.w + 1,
	);
	const endX = m4.x + m4.w;
	e.marks.reference('system-1-end', {
		kind: 'line',
		from: { x: endX, y: (lines[0] ?? 0) - 6 },
		to: { x: endX, y: (lines[4] ?? 0) + 6 },
		label: '',
		note: 'System 1 closing barline',
	});
	if (found.length > 0) {
		for (const clef of found) {
			e.marks.measure({
				kind: 'box',
				from: { x: clef.box.x, y: clef.box.y },
				to: { x: clef.box.x + clef.box.w, y: clef.box.y + clef.box.h },
				label: 'courtesy clef',
				note: 'courtesy clef before system 1 closing barline',
			});
		}
	} else {
		e.marks.measure({
			kind: 'box',
			from: { x: lastHead.head.x + lastHead.head.w + 4, y: lines[0] ?? 0 },
			to: { x: endX, y: lines[4] ?? 0 },
			label: 'missing',
			note: 'expected 1 courtesy bass clef before the end of system 1, found 0',
		});
	}
	return e.check(found.length);
}

/** The percussion clefs' offsets from each stave's middle line, and the five-line fit. */
async function percussionClefs() {
	const e = await engrave('clef-percussion', 'clef-percussion-centred');
	const s = e.space(0, 0);
	// A one-line stave reports five line positions and draws only the middle one.
	const five = e.lines(0, 0);
	const fiveMiddle = e.middle(0, 0);
	const oneLine = e.middle(0, 1);
	const m1 = e.measureRect(0);
	const clefNear = (y: number) =>
		must(
			e.of('clef').find((c) => Math.abs(centreY(c) - y) < 2 * s),
			'percussion clef',
		);
	const fiveClef = clefNear(fiveMiddle);
	const oneClef = clefNear(oneLine);
	const fiveLine = quarters(Math.abs(centreY(fiveClef) - fiveMiddle), s);
	const inMiddleSpaces =
		fiveClef.box.y >= (five[1] ?? 0) - 1 &&
		fiveClef.box.y + fiveClef.box.h <= (five[3] ?? 0) + 1;
	const oneLineOffset = quarters(Math.abs(centreY(oneClef) - oneLine), s);

	e.marks.reference('five-line-upper', {
		kind: 'line',
		from: { x: m1.x, y: five[1] ?? 0 },
		to: { x: m1.x + m1.w, y: five[1] ?? 0 },
		label: '',
		note: 'Upper boundary of middle two spaces (line 4)',
	});
	e.marks.reference('five-line-lower', {
		kind: 'line',
		from: { x: m1.x, y: five[3] ?? 0 },
		to: { x: m1.x + m1.w, y: five[3] ?? 0 },
		label: '',
		note: 'Lower boundary of middle two spaces (line 2)',
	});
	e.marks.reference('one-line', {
		kind: 'line',
		from: { x: m1.x, y: oneLine },
		to: { x: m1.x + m1.w, y: oneLine },
		label: '',
		note: 'Single stave line',
	});
	e.marks.measure({
		kind: 'box',
		from: { x: fiveClef.box.x, y: fiveClef.box.y },
		to: {
			x: fiveClef.box.x + fiveClef.box.w,
			y: fiveClef.box.y + fiveClef.box.h,
		},
		label: formatSpaces(fiveLine),
		note: `5-line percussion clef centre is ${formatSpaces(fiveLine)} spaces from middle line, ${inMiddleSpaces ? 'within' : 'outside'} middle two spaces`,
		pass: fiveLine === 0 && inMiddleSpaces,
	});
	e.marks.measure({
		kind: 'box',
		from: { x: oneClef.box.x, y: oneClef.box.y },
		to: {
			x: oneClef.box.x + oneClef.box.w,
			y: oneClef.box.y + oneClef.box.h,
		},
		label: formatSpaces(oneLineOffset),
		note: `1-line percussion clef centre is ${formatSpaces(oneLineOffset)} spaces from the line`,
		pass: oneLineOffset === 0,
	});
	return e.check({
		fiveLine,
		inMiddleSpaces,
		oneLine: oneLineOffset,
	});
}
