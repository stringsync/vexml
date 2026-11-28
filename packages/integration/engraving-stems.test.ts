import { describe, expect, it } from 'bun:test';
import { PNG } from 'pngjs';
import { formatSpaces } from './engraving-marks';
import {
	type EngravedNote,
	type Engraving,
	stemDirection,
	stemLength,
	stemTip,
} from './engraving-model';
import { draw, engrave, must, quarters } from './engraving-render';

// Behind Bars, pp. 13–16: stems and tails (ENGRAVING.md).
// stem-length (p. 14) stays standalone in engraving-stem-length.test.ts.
// stems.musicxml, treble, 4/4:
// - M1: C5 D5 E5 F5. M2: A4 G4 E4 C4. M3: G4 A4 B4 A4 (a middle-line B4 among up-stems).
// - M4: B4 ×4. M5: C6 E6 A3 F3 (two or more ledger lines).
// - M6: chords C4-E4-G4, D5-F5-A5, C6-E6, A3-C4.
// - M7: G4 as an eighth, sixteenth, 32nd and 64th, then rests.
// - M8: V1 F5 A5 C6 E6 over V2 a C4 whole.
// - M9: G4 B4 C5 D5 (B4 between opposing neighbours, resolved by its half-bar).
// - M10: G4 eighth, D5 eighth, B4 quarter, A4 half (opposing neighbours and mixed half-bar: down).
// tails.musicxml, treble, 4/4:
// - M1: G4 eighth (up), C5 eighth (down), with rests.
// - M2: V1 A5 and C6 eighths above V2's C4 whole (shortened outward stems).
// - M3: C6 sixteenth, E6 32nd, A3 sixteenth, F3 32nd, with rests.

describe('Behind Bars stems and tails (pp. 13–16)', () => {
	it.concurrent('draws stems', async () => {
		expect(await draw('stems')).toMatchScreenshot('engraving_stems.png');
	});

	it.concurrent('draws tails', async () => {
		expect(await draw('tails')).toMatchScreenshot('engraving_tails.png');
	});

	// Stems are thinner than stave lines.
	it.concurrent('stem-thickness (p. 13): draws stems thinner than stave lines', async () => {
		expect(await stemThicknessCheck()).toMatchMeasurements('thinner');
	});

	// Notes above the middle line take down-stems, notes below it up-stems.
	it.concurrent('stem-direction (p. 13): stems down above the middle line, up below', async () => {
		expect(await stemDirections([0, 1], 'stem-direction')).toMatchMeasurements([
			['down', 'down', 'down', 'down'],
			['up', 'up', 'up', 'up'],
		]);
	});

	// A middle-line note follows its neighbours' (and its beat's) direction; alone, down.
	it.concurrent('stem-middle-line (pp. 13–14): stems middle-line notes with neighbours', async () => {
		expect(
			await stemDirections([2, 3, 8, 9], 'stem-middle-line'),
		).toMatchMeasurements([
			['up', 'up', 'up', 'up'],
			['down', 'down', 'down', 'down'],
			['up', 'up', 'down', 'down'],
			['up', 'down', 'down', 'up'],
		]);
	});

	// Notes on more than one ledger line take stems that reach the middle line.
	it.concurrent('stem-ledger-middle (p. 14): extends ledger stems to the middle line', async () => {
		expect(await ledgerStemReach()).toMatchMeasurements([0, 0, 0, 0]);
	});

	// A chord's stem is measured from the note nearest the open end, as that note alone.
	it.concurrent('stem-chord (p. 15): measures chord stems from the open end', async () => {
		expect(await chordStems()).toMatchMeasurements({
			inStave: [3.5, 3.5, 3.5],
			ledgerFromMiddle: 0,
		});
	});

	// In two-part writing, outward stems shorten as notes leave the stave: 3½, 3, then 2½,
	// never shorter.
	it.concurrent('stem-outside-shortened (pp. 14–15): shortens outward stems to 2½', async () => {
		expect(
			await stemLengths(7, 'stem-outside-shortened', '1'),
		).toMatchMeasurements([3.5, 3, 2.5, 2.5]);
	});

	// Eighth and sixteenth stems stay 3½; each further tail lengthens the stem.
	it.concurrent('stem-flag-length (pp. 15–16): lengthens stems only for extra tails', async () => {
		expect(await flagStemLengths()).toMatchMeasurements([
			'3½',
			'3½',
			'longer',
			'longer',
		]);
	});

	// An up-stem's tail ends opposite or above its head; a down-stem's may touch the head.
	it.concurrent('tail-reach (p. 15): ends tails beside the notehead', async () => {
		expect(await tailReach()).toMatchMeasurements([
			'beside the head',
			'clear or touching',
		]);
	});

	// On a stem shorter than 3 spaces the tail must not overshoot the head.
	it.concurrent('tail-short-stem (p. 16): keeps tails on short stems beside the head', async () => {
		expect(await shortStemTails()).toMatchMeasurements([
			'beside the head',
			'beside the head',
		]);
	});

	// Decided (ledger/decisions.md): ledger-line flagged stems reach the middle line for
	// 8th/16th and extend past it by the extra-flag increment for 32nd+ (see ledger/decisions.md).
	it.concurrent('tail-ledger-clear (p. 16): extends ledger-line flagged stems by extra tails past the middle line', async () => {
		expect(await tailsOnLedgers()).toMatchMeasurements([
			'C/6 past middle 0',
			'E/6 past middle ¾',
			'A/3 past middle 0',
			'F/3 past middle ¾',
		]);
	});
});

/** Sub-pixel inked thickness of stems against stave lines, from the rendered pixels. */
async function stemThicknessCheck() {
	const e = await engrave('stems', 'stem-thickness');
	const png = PNG.sync.read(must(e.image, 'screenshot'));
	const darkness = (px: number, py: number): number => {
		const i = (Math.round(py) * png.width + Math.round(px)) * 4;
		return (255 - (png.data[i] ?? 255)) / 255;
	};
	const stave = must(e.of('stave')[0], 'first stave');
	const lines = e.lines(0);
	const bottomLine = Math.max(...lines);
	// Sample a clear column just before measure 1's closing barline, away from noteheads and stems.
	const lineX = stave.box.x + stave.box.w - 6 + e.shift.x;
	const lineSamples = lines.map((ly) => {
		const cy = Math.round(ly + e.shift.y);
		let sum = 0;
		for (let y = cy - 2; y <= cy + 2; y++) {
			sum += darkness(lineX, y);
		}
		return sum;
	});
	const line =
		Math.round(
			(lineSamples.reduce((a, b) => a + b, 0) / lineSamples.length) * 10,
		) / 10;
	// Sample measure 1's down-stems on rows clearly below the bottom stave line.
	let stemInk = 0;
	let stemRows = 0;
	for (const n of e.headsIn(0)) {
		const s = n.stem?.box;
		if (!s) {
			continue;
		}
		const y0 = Math.ceil(bottomLine + 3 + e.shift.y);
		const y1 = Math.floor(s.y + s.h - 2 + e.shift.y);
		const x0 = Math.floor(s.x - 1 + e.shift.x);
		const x1 = Math.ceil(s.x + s.w + 1 + e.shift.x);
		for (let y = y0; y <= y1; y++) {
			for (let x = x0; x <= x1; x++) {
				stemInk += darkness(x, y);
			}
			stemRows++;
		}
	}
	const stem = Math.round((stemInk / stemRows) * 10) / 10;
	const verdict = stem < line ? 'thinner' : `${stem}px >= ${line}px`;
	const sample = must(e.headsIn(0)[0]?.stem, 'first stem');
	const midY = e.middle(0);
	e.marks.reference('stave-line', {
		kind: 'line',
		from: { x: stave.box.x, y: midY },
		to: { x: stave.box.x + stave.box.w, y: midY },
		label: `line ${line}px`,
		note: `Stave line inked thickness: ${line}px`,
	});
	e.marks.measure({
		kind: 'box',
		from: { x: sample.box.x - 3, y: sample.box.y - 2 },
		to: {
			x: sample.box.x + sample.box.w + 3,
			y: sample.box.y + sample.box.h + 2,
		},
		label: `${stem}px`,
		note: `Average stem inked width ${stem}px vs stave line ${line}px (expected stem < stave line)`,
	});
	return e.check(verdict);
}

/** Stem lengths of a measure's notes, in quarter-spaces. */
async function stemLengths(measure: number, rule: string, voice?: string) {
	const e = await engrave('stems', rule);
	const lengths = e
		.headsIn(measure, voice ? { voice } : {})
		.map((n) => quarters(stemLength(n), e.space(measure)));
	return e.check(lengths);
}

/** Stem directions for the given measures, with direction marks on each stem. */
async function stemDirections(measures: number[], rule: string) {
	const e = await engrave('stems', rule);
	const results = measures.map((m) =>
		e.headsIn(m).map((n) => {
			const dir = stemDirection(n);
			if (n.middleLine) {
				const { left, right, y: midY } = n.middleLine;
				e.marks.reference(`middle-line:${Math.round(midY)}`, {
					kind: 'line',
					from: { x: left, y: midY },
					to: { x: right, y: midY },
					label: 'middle line',
					note: 'Middle stave line',
				});
			}
			const stem = n.stem?.box;
			if (stem) {
				const up = dir === 'up';
				const bracketX = up ? stem.x + stem.w + 6 : stem.x - 6;
				e.marks.measure({
					kind: 'bracket',
					from: { x: bracketX, y: n.cy },
					to: { x: bracketX, y: up ? stem.y : stem.y + stem.h },
					label: dir ?? 'none',
					note: `${n.pitch ?? 'note'}: ${dir ?? 'no'}-stem`,
				});
			}
			return dir;
		}),
	);
	return e.check(results);
}

/** How far ledger-line notes' stems end from the middle line, in quarter-spaces. */
async function ledgerStemReach() {
	const e = await engrave('stems', 'stem-ledger-middle');
	const midY = e.middle(4);
	const reaches = e.headsIn(4).map((n) => {
		const tip = stemTip(n);
		const dist = quarters(Math.abs(tip - midY), e.space(4));
		if (n.middleLine) {
			const { left, right, y } = n.middleLine;
			e.marks.reference(`middle-line:${Math.round(y)}`, {
				kind: 'line',
				from: { x: left, y },
				to: { x: right, y },
				label: 'middle line',
				note: 'Middle stave line',
			});
		}
		const stem = must(n.stem, `${n.pitch} stem`).box;
		const up = stemDirection(n) === 'up';
		const bracketX = up ? stem.x + stem.w + 6 : stem.x - 6;
		e.marks.measure({
			kind: 'bracket',
			from: { x: bracketX, y: n.cy },
			to: { x: bracketX, y: tip },
			label: formatSpaces(dist),
			note: `${n.pitch ?? 'note'}: stem tip ${formatSpaces(dist)} spaces from middle line (expected 0)`,
		});
		return dist;
	});
	return e.check(reaches);
}

/** Each chord's stem, measured from its note nearest the open end. */
async function chordStems() {
	const e = await engrave('stems', 'stem-chord');
	const chords = new Map<number, EngravedNote[]>();
	for (const n of e.headsIn(5)) {
		const key = Math.round(n.head.x);
		chords.set(key, [...(chords.get(key) ?? []), n]);
	}
	const open = [...chords.values()].map((notes) => {
		const up = stemDirection(must(notes[0], 'chord note')) === 'up';
		return must(
			[...notes].sort((a, b) => (up ? a.cy - b.cy : b.cy - a.cy))[0],
			'chord note',
		);
	});
	const [a, b, ledger, d] = open.map((n) => must(n, 'chord'));
	const s = e.space(5);
	const inStave = [a, b, d].map((n) => {
		const len = quarters(stemLength(must(n, 'chord')), s);
		return len;
	});
	const ledgerNote = must(ledger, 'ledger chord');
	const tip = stemTip(ledgerNote);
	const midY = e.middle(5);
	const ledgerFromMiddle = quarters(Math.abs(tip - midY), s);
	const stem = must(ledgerNote.stem, 'ledger chord stem').box;
	const up = stemDirection(ledgerNote) === 'up';
	const bracketX = up ? stem.x + stem.w + 6 : stem.x - 6;
	e.marks.measure({
		kind: 'bracket',
		from: { x: bracketX, y: ledgerNote.cy },
		to: { x: bracketX, y: tip },
		label: formatSpaces(ledgerFromMiddle),
		note: `${ledgerNote.pitch ?? 'chord'}: ledger chord stem tip ${formatSpaces(ledgerFromMiddle)} spaces from middle line (expected 0)`,
		pass: ledgerFromMiddle === 0,
	});
	return e.check({ inStave, ledgerFromMiddle });
}

/** Eighth and sixteenth stay 3½; 32nd > 3½; 64th > 32nd. */
async function flagStemLengths() {
	const e = await engrave('stems', 'stem-flag-length');
	const notes = e.headsIn(6);
	const lens = notes.map((n) => quarters(stemLength(n), e.space(6)));
	const [eighth = 0, sixteenth = 0, thirtySecond = 0, sixtyFourth = 0] = lens;
	const result = [
		eighth === 3.5 ? '3½' : formatSpaces(eighth),
		sixteenth === 3.5 ? '3½' : formatSpaces(sixteenth),
		thirtySecond > 3.5 ? 'longer' : formatSpaces(thirtySecond),
		sixtyFourth > thirtySecond ? 'longer' : formatSpaces(sixtyFourth),
	];
	return e.check(result);
}

/** The tail's ink beside its stem (the flag glyph also runs down the stem itself). */
function tailBands(n: EngravedNote): [number, number][] {
	const flag = must(n.flag, `${n.pitch} tail`);
	const stem = must(n.stem, `${n.pitch} stem`);
	const bands: [number, number][] = [];
	for (let x = stem.box.x + stem.box.w + 1; x < flag.box.x + flag.box.w; x++) {
		bands.push(...flag.bandsAt(x));
	}
	return bands;
}

/** Tight box of the tail's ink to the right of its stem. */
function tailBox(n: EngravedNote): {
	x: number;
	y: number;
	w: number;
	h: number;
} {
	const flag = must(n.flag, `${n.pitch} tail`);
	const stem = must(n.stem, `${n.pitch} stem`);
	const x = stem.box.x + stem.box.w + 1;
	const bands = tailBands(n);
	const top = Math.min(...bands.map(([a]) => a));
	const bottom = Math.max(...bands.map(([, b]) => b));
	return {
		x,
		y: top,
		w: Math.max(1, flag.box.x + flag.box.w - x),
		h: Math.max(1, bottom - top),
	};
}

/** Where an up-stem's tail ends against its head: opposite or above it, or past it. */
function upTailEnd(n: EngravedNote): string {
	const lowest = Math.max(...tailBands(n).map(([, b]) => b));
	const verdict =
		lowest <= n.head.y + n.head.h + 1 ? 'beside the head' : 'past the head';
	const box = tailBox(n);
	n.marks.reference(`head-bottom-${Math.round(n.head.x)}`, {
		kind: 'line',
		from: { x: n.head.x - 2, y: n.head.y + n.head.h },
		to: { x: box.x + box.w + 2, y: n.head.y + n.head.h },
		label: '',
		note: `${n.pitch ?? 'note'} notehead bottom edge`,
	});
	n.marks.measure({
		kind: 'box',
		from: { x: box.x, y: box.y },
		to: { x: box.x + box.w, y: box.y + box.h },
		label: verdict,
		note: `${n.pitch ?? 'note'} up-stem tail ends ${verdict}`,
	});
	return verdict;
}

/**
 * Whether a down-stem's tail stays clear of its head. Touching is allowed: 0.3 space of
 * overlap is the curve's antialiased tip meeting the head's edge.
 */
function downTailEnd(n: EngravedNote, e: Engraving): string {
	const highest = Math.min(...tailBands(n).map(([a]) => a));
	const verdict =
		highest >= n.head.y + n.head.h - 0.3 * e.space(n.measure)
			? 'clear or touching'
			: 'into the head';
	const box = tailBox(n);
	n.marks.reference(`head-bottom-${Math.round(n.head.x)}`, {
		kind: 'line',
		from: { x: n.head.x - 2, y: n.head.y + n.head.h },
		to: { x: box.x + box.w + 2, y: n.head.y + n.head.h },
		label: '',
		note: `${n.pitch ?? 'note'} notehead bottom edge`,
	});
	n.marks.measure({
		kind: 'box',
		from: { x: box.x, y: box.y },
		to: { x: box.x + box.w, y: box.y + box.h },
		label: verdict,
		note: `${n.pitch ?? 'note'} down-stem tail is ${verdict}`,
	});
	return verdict;
}

async function tailReach() {
	const e = await engrave('tails', 'tail-reach');
	const up = must(e.headsIn(0)[0], 'up-stem eighth');
	const down = must(e.headsIn(0)[1], 'down-stem eighth');
	return e.check([upTailEnd(up), downTailEnd(down, e)]);
}

async function shortStemTails() {
	const e = await engrave('tails', 'tail-short-stem');
	return e.check(e.headsIn(1, { voice: '1' }).map(upTailEnd));
}

/** How far ledger-line flagged stems extend past the middle line, in quarter-spaces. */
async function tailsOnLedgers() {
	const e = await engrave('tails', 'tail-ledger-clear');
	const midY = e.middle(2);
	const space = e.space(2);
	const rect = e.measureRect(2);
	e.marks.reference('middle-line', {
		kind: 'line',
		from: { x: rect.x, y: midY },
		to: { x: rect.x + rect.w, y: midY },
		label: 'middle line',
		note: 'Middle stave line',
	});
	const results = e.headsIn(2).map((n) => {
		const stem = must(n.stem, `${n.pitch} stem`).box;
		const tip = stemTip(n);
		const up = stemDirection(n) === 'up';
		const pastMiddle = quarters(up ? midY - tip : tip - midY, space);
		const bracketX = up ? stem.x + stem.w + 6 : stem.x - 6;
		e.marks.measure({
			kind: 'bracket',
			from: { x: bracketX, y: n.cy },
			to: { x: bracketX, y: tip },
			label: formatSpaces(pastMiddle),
			note: `${n.pitch ?? 'note'}: stem tip ${formatSpaces(pastMiddle)} spaces past middle line`,
		});
		return `${n.pitch} past middle ${formatSpaces(pastMiddle)}`;
	});
	return e.check(results);
}
