import { describe, expect, it } from 'bun:test';
import type { Box } from './engraving-ink';
import type { EngravedNote, Engraving } from './engraving-model';
import { draw, engrave, must, quarters } from './engraving-render';
import { markBox } from './engraving-spacing-measures';

describe('Behind Bars accidentals: octaves, adjacent notes, down-stems and double-stemmed voices', () => {
	it.concurrent('draws octave-offset, adjacent, down-stem and double-stemmed accidentals', async () => {
		expect(await draw('accidentals-voices')).toMatchScreenshot(
			'engraving_accidentals-voices.png',
		);
	});

	it.concurrent('acc-chord-octave-offset (p. 90): keeps the approved accidental columns on chords containing octaves', async () => {
		const e = await engrave('accidentals-voices', 'acc-chord-octave-offset');
		expect(
			e.check(chords(e, 0).map((chord) => columnOrder(e, chord))),
		).toMatchMeasurements([
			['F#/5', 'G#/4', 'F#/4'],
			['Eb/4 Eb/5', 'Bb/4'],
		]);
	});

	it.concurrent('acc-chord-adjacent-close-conventional (p. 90): uses conventional alternating order on close chords with several accidentals', async () => {
		const e = await engrave(
			'accidentals-voices',
			'acc-chord-adjacent-close-conventional',
		);
		expect(
			e.check(chords(e, 2).map((chord) => columnOrder(e, chord))),
		).toMatchMeasurements([
			['C#/5', 'F#/4', 'A#/4', 'G#/4'],
			['Db/5', 'G/4', 'Bb/4', 'Ab/4'],
		]);
	});

	it.concurrent('acc-downstem-tuck (p. 90): tucks clear accidentals on down-stems', async () => {
		const e = await engrave('accidentals-voices', 'acc-downstem-tuck');
		expect(
			e.check(chords(e, 3).map((chord) => tuckedPitches(e, chord))),
		).toMatchMeasurements([['F#/4'], ['Fb/5']]);
	});

	it.concurrent('acc-double-stem-order (pp. 90–91): places double-stemmed accidentals before both parts, uppermost closest', async () => {
		const e = await engrave('accidentals-voices', 'acc-double-stem-order');
		const notes = e.headsIn(4);
		const beat1 = notes.filter(
			(n) => n.head.x < e.measureRect(4).x + e.measureRect(4).w / 2,
		);
		const beat2 = notes.filter(
			(n) => n.head.x >= e.measureRect(4).x + e.measureRect(4).w / 2,
		);
		const allBefore = (group: EngravedNote[]) => {
			const minHeadX = Math.min(...group.map((n) => n.head.x));
			return group
				.filter(hasSign)
				.every((n) => sign(n).x + sign(n).w <= minHeadX + 1);
		};
		expect(
			e.check([
				allBefore(beat1),
				columnOrder(e, beat1),
				allBefore(beat2),
				columnOrder(e, beat2)[0],
			]),
		).toMatchMeasurements([true, ['Ab/4', 'E/4'], true, 'D#/4 C#/5']);
	});

	it.concurrent('acc-double-stem-altered-unison (p. 91): separates altered-unison heads and places each accidental beside its own voice', async () => {
		const e = await engrave(
			'accidentals-voices',
			'acc-double-stem-altered-unison',
		);
		const notes = e.headsIn(7);
		const midX = e.measureRect(7).x + e.measureRect(7).w / 2;
		const beat1 = notes.filter((n) => n.head.x < midX);
		const beat3 = notes.filter((n) => n.head.x >= midX);

		const tiedF = must(
			beat1.find((n) => n.voice === '2'),
			'tied F#4',
		);
		const enteringF = must(
			beat1.find((n) => n.voice === '1'),
			'entering F4',
		);
		const enteringFSign = mark(e, enteringF);

		const sharpC = must(
			beat3.find((n) => n.voice === '1'),
			'C#5',
		);
		const naturalC = must(
			beat3.find((n) => n.voice === '2'),
			'C5',
		);
		const sharpCSign = mark(e, sharpC);
		const naturalCSign = mark(e, naturalC);

		const between = (left: EngravedNote, box: Box, right: EngravedNote) =>
			box.x >= left.head.x + left.head.w && box.x + box.w <= right.head.x + 1;

		expect(
			e.check({
				beat1HeadsSeparated: enteringF.head.x > tiedF.head.x + tiedF.head.w,
				beat1TiedClean: !hasSign(tiedF),
				beat1NaturalBetween:
					hasSign(enteringF) && between(tiedF, enteringFSign, enteringF),
				beat3HeadsSeparated: naturalC.head.x > sharpC.head.x + sharpC.head.w,
				beat3SharpBeforeLeft:
					hasSign(sharpC) && sharpCSign.x + sharpCSign.w <= sharpC.head.x + 1,
				beat3NaturalBetween:
					hasSign(naturalC) && between(sharpC, naturalCSign, naturalC),
			}),
		).toMatchMeasurements({
			beat1HeadsSeparated: true,
			beat1TiedClean: true,
			beat1NaturalBetween: true,
			beat3HeadsSeparated: true,
			beat3SharpBeforeLeft: true,
			beat3NaturalBetween: true,
		});
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
	const groups: EngravedNote[][] = [];
	const tol = e.space(measure) * 2.5;
	for (const note of [...e.headsIn(measure)].sort(
		(a, b) => a.head.x - b.head.x,
	)) {
		const last = groups.at(-1);
		if (last && note.head.x - must(last[0], 'chord').head.x <= tol) {
			last.push(note);
		} else {
			groups.push([note]);
		}
	}
	return groups.map((members) => members.sort((a, b) => b.cy - a.cy));
}

function mark(e: Engraving, note: EngravedNote): Box {
	const box = sign(note);
	markBox(e, box, `${note.pitch} sign`);
	return box;
}

/** The signs with room above or below the displaced head that reach back over it. */
function tuckedPitches(e: Engraving, chord: EngravedNote[]): string[] {
	const space = must(chord[0], 'chord').space;
	const stemX = Math.max(...chord.map((n) => n.head.x));
	const displaced = chord.filter((n) => n.head.x < stemX - 1);
	return chord
		.filter(hasSign)
		.filter((n) => displaced.every((d) => Math.abs(n.cy - d.cy) >= 2 * space))
		.filter((n) => {
			const box = mark(e, n);
			return displaced.every((d) => box.x >= d.head.x - space / 4);
		})
		.map((n) => must(n.pitch, 'pitch'));
}

/** The chord's accidental columns, nearest the heads first, members of a column low to high. */
function columnOrder(e: Engraving, chord: EngravedNote[]): string[] {
	const columns: { x: number; pitches: string[] }[] = [];
	const quarter = must(chord[0], 'chord').space / 4;
	const sorted = [...chord].sort((a, b) => b.cy - a.cy);
	for (const note of sorted.filter(hasSign)) {
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

// Keep quarters imported if needed for future checks.
void quarters;
