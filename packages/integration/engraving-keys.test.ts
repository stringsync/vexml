import { describe, expect, it } from 'bun:test';
import type { Box, Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';

describe('Behind Bars key signatures: clefs, spacing, changes and per-stave keys', () => {
	it.concurrent('draws key signatures across clefs, changes, system breaks and custom keys', async () => {
		expect(await draw('keys')).toMatchScreenshot('engraving_keys.png');
	});

	it.concurrent('draws independent key signatures per stave on a grand staff', async () => {
		expect(await draw('keys-staves')).toMatchScreenshot(
			'engraving_keys-staves.png',
		);
	});

	it.concurrent('draws 7-sharp and 7-flat key signatures in treble, alto, tenor and bass clefs', async () => {
		expect(await draw('keys-clefs')).toMatchScreenshot(
			'engraving_keys-clefs.png',
		);
	});

	it.concurrent('key-placement-order (p. 91): places the key signature after the clef and before the time signature', async () => {
		const e = await engrave('keys', 'key-placement-order');
		const clef = unionBox(e.inMeasure('clef', 0), 'opening clef');
		const key = unionBox(keyInks(e, 0), 'opening key signature');
		const time = unionBox(e.inMeasure('timesignature', 0), 'opening time');
		markBox(e, clef, 'Clef');
		markBox(e, key, 'Key signature');
		markBox(e, time, 'Time signature');
		expect(
			e.check([clef.x + clef.w <= key.x, key.x + key.w <= time.x]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('key-cycle-of-fifths-clefs (p. 91): places tenor-clef sharps ascending from bottom space and seven signs per clef', async () => {
		const e = await engrave('keys-clefs', 'key-cycle-of-fifths-clefs');
		const sharpsByStaff = [1, 2, 3, 4].map((staff) =>
			glyphBoxes(staffKeyInks(e, 0, staff)),
		);
		const flatsByStaff = [1, 2, 3, 4].map((staff) =>
			glyphBoxes(staffKeyInks(e, 2, staff)),
		);
		const tenorSharps = must(sharpsByStaff[2], 'tenor sharps');
		const tenorLines = e.lines(0, 0, 3);
		const firstSharp = must(tenorSharps[0], 'first tenor sharp');
		const secondSharp = must(tenorSharps[1], 'second tenor sharp');
		const firstSharpY = firstSharp.y + firstSharp.h / 2;
		const secondSharpY = secondSharp.y + secondSharp.h / 2;
		markBox(e, unionBoxes(tenorSharps, 'tenor sharps'), 'Tenor 7 sharps');
		expect(
			e.check([
				sharpsByStaff.map((s) => s.length),
				flatsByStaff.map((s) => s.length),
				// Tenor clef starts on bottom space (below middle line) and rises to C4.
				firstSharpY > must(tenorLines[2], 'tenor middle line') &&
					secondSharpY < firstSharpY,
			]),
		).toMatchMeasurements([[7, 7, 7, 7], [7, 7, 7, 7], true]);
	});

	it.concurrent('key-spacing-sharps (p. 92): spaces key-signature sharps without horizontal overlap', async () => {
		const e = await engrave('keys', 'key-spacing-sharps');
		const sharps = glyphBoxes(keyInks(e, 1));
		for (const [i, box] of sharps.entries()) {
			markBox(e, box, `Sharp ${i + 1}`);
		}
		expect(e.check(sharps.length)).toMatchMeasurements(4);
	});

	it.concurrent('key-spacing-flats (p. 92): spaces key-signature flats evenly without horizontal overlap', async () => {
		const e = await engrave('keys', 'key-spacing-flats');
		// M4 also closes its system with the cautionary key of the change that follows.
		const firstNote = must(e.inMeasure('notehead', 3)[0], 'M4 notehead');
		const flats = glyphBoxes(
			keyInks(e, 3).filter((ink) => ink.box.x < firstNote.box.x),
		);
		for (const [i, box] of flats.entries()) {
			markBox(e, box, `Flat ${i + 1}`);
		}
		expect(e.check(flats.length)).toMatchMeasurements(4);
	});

	it.concurrent('key-change-after-barline (p. 92): places a mid-system key change after the barline', async () => {
		const e = await engrave('keys', 'key-change-after-barline');
		const key = unionBox(keyInks(e, 2), 'M3 key change');
		const barX = e.measureRect(2).x;
		markBox(e, key, 'Key change after barline');
		expect(e.check(key.x > barX)).toMatchMeasurements(true);
	});

	it.concurrent('key-change-cancel-to-open (pp. 92–93): cancels 4 sharps with 4 naturals in order when moving to C major', async () => {
		const e = await engrave('keys', 'key-change-cancel-to-open');
		const naturals = glyphBoxes(keyInks(e, 2));
		markBox(
			e,
			unionBoxes(naturals, 'cancelling naturals'),
			'4 cancelling naturals',
		);
		expect(e.check(naturals.length)).toMatchMeasurements(4);
	});

	it.concurrent('key-change-cancel-order (pp. 92–93): prints only the new key when cancellation is unspecified', async () => {
		const e = await engrave('keys', 'key-change-cancel-order');
		const m5 = glyphBoxes(keyInks(e, 4));
		const m6 = glyphBoxes(keyInks(e, 5));
		markBox(e, unionBoxes(m5, 'M5 key signature'), 'M5: 3 sharps only');
		markBox(e, unionBoxes(m6, 'M6 key signature'), 'M6: 1 sharp only');
		expect(e.check([m5.length, m6.length])).toMatchMeasurements([3, 1]);
	});

	it.concurrent('key-change-system-break (p. 93): cautions the key change at the system end and opens the new system with the new key alone', async () => {
		const e = await engrave('keys', 'key-change-system-break');
		const mark = (m: number) => e.measureRect(m);
		// M7 ends the system: its own key opens it after a barline, the caution trails its notes.
		const lastNote = must(
			e.inMeasure('notehead', 6).at(-1),
			'last notehead of M7',
		);
		const caution = keyInks(e, 6).filter((ink) => ink.box.x > lastNote.box.x);
		const cautionBox = unionBox(caution, 'cautionary key at end of M7');
		const opening = unionBox(keyInks(e, 7), 'M8 opening key');
		markBox(e, cautionBox, 'Cautionary key (naturals + 2 sharps)');
		markBox(e, opening, 'New system: 2 sharps only');
		expect(
			e.check([
				// 3 cancelling naturals and 2 new sharps before the barline.
				glyphBoxes(caution).length,
				cautionBox.x + cautionBox.w <= mark(6).x + mark(6).w + 1,
				// No naturals restated at the new system.
				glyphBoxes(keyInks(e, 7)).length,
			]),
		).toMatchMeasurements([5, true, 2]);
	});

	it.concurrent('key-clef-simultaneous (p. 93): places the new clef before the barline and the new key after it', async () => {
		const e = await engrave('keys', 'key-clef-simultaneous');
		const barX = e.measureRect(9).x;
		const clef = must(
			e.inMeasure('clef', 8).at(-1),
			'courtesy bass clef at end of M9',
		);
		const key = unionBox(keyInks(e, 9), 'M10 key signature');
		markBox(e, clef.box, 'Clef before barline');
		markBox(e, key, 'Key after barline');
		expect(
			e.check([clef.box.x + clef.box.w <= barX + 1, key.x >= barX]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('key-per-stave (pp. 93–94): draws independent key signatures on each stave of a grand staff', async () => {
		const e = await engrave('keys-staves', 'key-per-stave');
		const staff1 = glyphBoxes(staffKeyInks(e, 0, 1));
		const staff2 = glyphBoxes(staffKeyInks(e, 0, 2));
		markBox(e, unionBoxes(staff1, 'staff 1 key'), 'Staff 1: 2 sharps');
		markBox(e, unionBoxes(staff2, 'staff 2 key'), 'Staff 2: 3 flats');
		expect(e.check([staff1.length, staff2.length])).toMatchMeasurements([2, 3]);
	});

	it.concurrent('key-unconventional (p. 94): renders arbitrary non-traditional key signature accidentals', async () => {
		const e = await engrave('keys', 'key-unconventional');
		const signs = glyphBoxes(keyInks(e, 10));
		markBox(e, unionBoxes(signs, 'unconventional key'), 'F# and Bb key');
		expect(e.check(signs.length)).toMatchMeasurements(2);
	});
});

function keyInks(e: Engraving, measure: number): Ink[] {
	const found = e.inMeasure('keysignature', measure);
	return (found.length > 0 ? found : e.inMeasure('accidental', measure)).sort(
		(a, b) => a.box.x - b.box.x,
	);
}

function staffKeyInks(e: Engraving, measure: number, staff: number): Ink[] {
	const lines = e.lines(measure, 0, staff);
	const space = (lines[1] ?? 0) - (lines[0] ?? 0) || 10;
	const top = (lines[0] ?? 0) - 3 * space;
	const bottom = (lines[lines.length - 1] ?? 0) + 3 * space;
	const rect = e.measureRect(measure);
	const all = e.of('keysignature');
	const source = all.length > 0 ? all : e.of('accidental');
	return source
		.filter((ink) => {
			const cx = ink.box.x + ink.box.w / 2;
			const cy = ink.box.y + ink.box.h / 2;
			return cx >= rect.x && cx < rect.x + rect.w && cy >= top && cy <= bottom;
		})
		.sort((a, b) => a.box.x - b.box.x);
}

/** Splits a key-signature ink mask into individual horizontally-separated glyph boxes. */
function glyphBoxes(inks: Ink[]): Box[] {
	const boxes: Box[] = [];
	for (const ink of inks) {
		const xStart = Math.floor(ink.box.x);
		const xEnd = Math.ceil(ink.box.x + ink.box.w);
		let active: { x1: number; x2: number; y1: number; y2: number } | null =
			null;
		for (let x = xStart; x <= xEnd; x++) {
			const bands = ink.bandsAt(x);
			if (bands.length > 0) {
				const top = must(bands[0], 'top band')[0];
				const bottom = must(bands.at(-1), 'bottom band')[1];
				if (active) {
					active.x2 = x + 1;
					active.y1 = Math.min(active.y1, top);
					active.y2 = Math.max(active.y2, bottom);
				} else {
					active = { x1: x, x2: x + 1, y1: top, y2: bottom };
				}
			} else if (active) {
				boxes.push({
					x: active.x1,
					y: active.y1,
					w: active.x2 - active.x1,
					h: active.y2 - active.y1,
				});
				active = null;
			}
		}
		if (active) {
			boxes.push({
				x: active.x1,
				y: active.y1,
				w: active.x2 - active.x1,
				h: active.y2 - active.y1,
			});
		}
	}
	return boxes;
}

function unionBox(inks: Ink[], label: string): Box {
	return unionBoxes(
		inks.map((i) => i.box),
		label,
	);
}

function unionBoxes(boxes: Box[], label: string): Box {
	const first = must(boxes[0], label);
	let x1 = first.x;
	let y1 = first.y;
	let x2 = first.x + first.w;
	let y2 = first.y + first.h;
	for (const box of boxes.slice(1)) {
		x1 = Math.min(x1, box.x);
		y1 = Math.min(y1, box.y);
		x2 = Math.max(x2, box.x + box.w);
		y2 = Math.max(y2, box.y + box.h);
	}
	return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}
