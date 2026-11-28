import { describe, expect, it } from 'bun:test';
import type { Box } from './engraving-ink';
import type { EngravedNote, Engraving } from './engraving-model';
import { draw, engrave, must, quarters } from './engraving-render';
import { markBox } from './engraving-spacing-measures';

/*
 * A note's ink rect covers its head and its own accidental, so the rect's left edge is the
 * accidental's, and a rect taller than the head is the accidental's height. Chord members
 * each carry their own rect, which is all the stacking checks need: which column a sign
 * sits in (its left edge) and how far apart two columns are.
 */

describe('Behind Bars accidentals: placing, brackets, ties and chords', () => {
	it.concurrent('draws grace, cue, ledger, bracketed, tied and chord accidentals', async () => {
		expect(await draw('accidentals')).toMatchScreenshot(
			'engraving_accidentals.png',
		);
	});

	it.concurrent('acc-small-grace-cue (p. 78): draws grace- and cue-note accidentals smaller than full-size ones', async () => {
		const e = await engrave('accidentals', 'acc-small-grace-cue');
		const grace = must(
			e.notes.find((n) => n.measure === 0 && n.grace),
			'grace note',
		);
		const [full, cue] = e.headsIn(1);
		const reach = (n: EngravedNote | undefined, label: string) => {
			const note = must(n, label);
			const box = sign(note);
			markBox(e, box, label);
			return quarters(box.w, note.space);
		};
		const fullReach = reach(full, 'Full-size sharp');
		expect(
			e.check([
				reach(grace, 'Grace sharp') < fullReach,
				reach(cue, 'Cue sharp') < fullReach,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('acc-ledger-placement (p. 78): centres a ledger note’s sharp on its line or space', async () => {
		const e = await engrave('accidentals', 'acc-ledger-placement');
		expect(
			e.check(
				e.headsIn(2).map((note) => {
					const ink = must(note.ink, 'note ink');
					markBox(e, sign(note), `${note.pitch} sharp`);
					const off = ink.y + ink.h / 2 - note.cy;
					return Math.abs(off) <= note.space / 8;
				}),
			),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('acc-small-above (p. 83): draws an accidental-mark small above its note', async () => {
		const e = await engrave('accidentals', 'acc-small-above');
		const heads = e.headsIn(6);
		const above = ['ornament', 'accidental'].flatMap((kind) =>
			e
				.inMeasure(kind, 6)
				.filter(({ box }) => heads.some((h) => box.y + box.h <= h.head.y)),
		);
		for (const { box } of above) {
			markBox(e, box, 'Mark above');
		}
		expect(e.check(above.length >= heads.length)).toMatchMeasurements(true);
	});

	it.concurrent('acc-tie-barline (pp. 80–81): leaves a tied note’s accidental off after the barline', async () => {
		const e = await engrave('accidentals', 'acc-tie-barline');
		const held = must(e.headsIn(18)[0], 'tied-into F#4');
		markBox(e, must(held.ink, 'note ink'), 'Tied-into F#4');
		expect(e.check(hasSign(held))).toMatchMeasurements(false);
	});

	it.concurrent('acc-tie-system-break (p. 80): repeats a tied note’s accidental at the start of a new system', async () => {
		const e = await engrave('accidentals', 'acc-tie-system-break');
		const held = must(e.headsIn(20)[0], 'tied-into G#4');
		markBox(e, must(held.ink, 'note ink'), 'Tied-into G#4');
		expect(e.check(hasSign(held))).toMatchMeasurements(true);
	});

	it.concurrent('acc-chord-octave-align (p. 88): aligns accidentals an octave or more apart', async () => {
		const e = await engrave('accidentals', 'acc-chord-octave-align');
		expect(
			e.check(chords(e, 8).map(([low, high]) => aligned(e, low, high))),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('acc-chord-seventh (p. 88): aligns accidentals a seventh apart', async () => {
		const e = await engrave('accidentals', 'acc-chord-seventh');
		const [flats, sharps] = chords(e, 9);
		expect(
			e.check([
				aligned(e, ...must(flats, 'flats')),
				aligned(e, ...must(sharps, 'sharps')),
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('acc-chord-sixth-flat-top (p. 88): aligns accidentals a sixth apart under an upper flat', async () => {
		const e = await engrave('accidentals', 'acc-chord-sixth-flat-top');
		expect(
			e.check(chords(e, 10).map(([low, high]) => aligned(e, low, high))),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('acc-chord-sixth-sharp-top (p. 88): offsets the lower accidental under an upper sharp, sharps side by side', async () => {
		const e = await engrave('accidentals', 'acc-chord-sixth-sharp-top');
		const [sharps, mixed] = chords(e, 11).map(([low, high]) =>
			offset(e, low, high),
		);
		expect(
			e.check([must(sharps, 'sharps') >= 1, must(mixed, 'flat') > 0]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('acc-chord-fifth-higher-closest (p. 88): puts the higher accidental nearest a chord a fifth or less, the lower to its left', async () => {
		const e = await engrave('accidentals', 'acc-chord-fifth-higher-closest');
		expect(
			e.check(chords(e, 12).map(([low, high]) => offset(e, low, high) > 0)),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('acc-chord-fourth-fifth-overlap (p. 88): tucks flats a fifth apart and keeps naturals a fourth apart clear', async () => {
		const e = await engrave('accidentals', 'acc-chord-fourth-fifth-overlap');
		const [flats, naturals] = chords(e, 13);
		expect(
			e.check([
				// A flat is under one space wide: a smaller step tucks it partly under.
				offset(e, ...must(flats, 'flats')) < 0.75,
				offset(e, ...must(naturals, 'naturals')) >= 0.75,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('acc-chord-close-alternate (pp. 87, 89): alternates a close chord’s accidentals from the highest and lowest', async () => {
		const e = await engrave('accidentals', 'acc-chord-close-alternate');
		expect(
			e.check(chords(e, 14).map((chord) => columnOrder(e, chord))),
		).toMatchMeasurements([
			['C#/5', 'F#/4', 'A#/4'],
			['D/5', 'G#/4', 'Bb/4'],
		]);
	});

	it.concurrent('acc-chord-seventh-outer (p. 89): aligns the outer accidentals of a seventh nearest, then alternates', async () => {
		const e = await engrave('accidentals', 'acc-chord-seventh-outer');
		expect(
			e.check(chords(e, 15).map((chord) => columnOrder(e, chord))),
		).toMatchMeasurements([['Eb/4 Db/5', 'Bb/4', 'Gb/4']]);
	});

	it.concurrent('acc-chord-wide-pairs (p. 89): aligns pairs of accidentals in a wide chord of overlapping octaves', async () => {
		const e = await engrave('accidentals', 'acc-chord-wide-pairs');
		expect(
			e.check(chords(e, 16).map((chord) => columnOrder(e, chord))),
		).toMatchMeasurements([['G#/4 G#/5', 'C#/4 C#/5']]);
	});
});

/** The accidental's span: from the note's ink left edge to its head. */
function sign(note: EngravedNote): Box {
	const ink = must(note.ink, 'note ink');
	return { x: ink.x, y: ink.y, w: note.head.x - ink.x, h: ink.h };
}

function hasSign(note: EngravedNote): boolean {
	return sign(note).w > 0;
}

/** A measure's chords, each a list of its members low to high. */
function chords(e: Engraving, measure: number): EngravedNote[][] {
	const byX = new Map<number, EngravedNote[]>();
	for (const note of e.headsIn(measure)) {
		const key = Math.round(note.head.x);
		byX.set(key, [...(byX.get(key) ?? []), note]);
	}
	return [...byX.entries()]
		.sort(([a], [b]) => a - b)
		.map(([, members]) => members.sort((a, b) => b.cy - a.cy));
}

function mark(e: Engraving, note: EngravedNote): Box {
	const box = sign(note);
	markBox(e, box, `${note.pitch} sign`);
	return box;
}

/** How far, in stave-spaces, the lower note's accidental sits left of the higher's. */
function offset(e: Engraving, low?: EngravedNote, high?: EngravedNote): number {
	const lo = mark(e, must(low, 'lower note'));
	const hi = mark(e, must(high, 'higher note'));
	return quarters(hi.x - lo.x, must(high, 'higher note').space);
}

function aligned(
	e: Engraving,
	low?: EngravedNote,
	high?: EngravedNote,
): boolean {
	return Math.abs(offset(e, low, high)) <= 0.25;
}

/** The chord's accidental columns, nearest the heads first, members of a column low to high. */
function columnOrder(e: Engraving, chord: EngravedNote[]): string[] {
	const columns: { x: number; pitches: string[] }[] = [];
	const quarter = (must(chord[0], 'chord').space * 1) / 4;
	for (const note of chord.filter(hasSign)) {
		const { x } = mark(e, note);
		const column = columns.find((c) => Math.abs(c.x - x) <= quarter);
		if (column) {
			column.pitches.push(must(note.pitch, 'pitch'));
		} else {
			columns.push({ x, pitches: [must(note.pitch, 'pitch')] });
		}
	}
	return columns.sort((a, b) => b.x - a.x).map((c) => c.pitches.join(' '));
}
