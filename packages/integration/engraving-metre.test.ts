import { describe, expect, it } from 'bun:test';
import type { Box, Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must, quarters } from './engraving-render';
import { markBox } from './engraving-spacing-measures';

describe('Behind Bars metre and rhythmic grouping (pp. 149–163)', () => {
	it.concurrent('draws time signatures and feathered beams', async () => {
		expect(await draw('metre-time')).toMatchScreenshot(
			'engraving_metre-time.png',
		);
	});

	it.concurrent('draws horizontal rest alignment and whole-bar rests', async () => {
		expect(await draw('metre-rests')).toMatchScreenshot(
			'engraving_metre-rests.png',
		);
	});

	it.concurrent('draws whole-bar rests with signatures, breve metres and half-bar semibreve rest', async () => {
		expect(await draw('metre-whole-rests')).toMatchScreenshot(
			'engraving_metre-whole-rests.png',
		);
	});

	it.concurrent('time-numeral-height (p. 152): fills the full height of the five-line stave', async () => {
		const e = await engrave('metre-time', 'time-numeral-height');
		const results = [0, 2, 3].map((m) => {
			const firstNote = must(
				e.inMeasure('notehead', m)[0],
				`M${m + 1} first note`,
			);
			const time = unionBox(
				e
					.inMeasure('timesignature', m)
					.filter((t) => t.box.x < firstNote.box.x),
				`M${m + 1} time`,
			);
			const lines = e.lines(m);
			const sp = e.space(m);
			const top = must(lines[0], 'top line');
			const bottom = must(lines[4], 'bottom line');
			markBox(e, time, `M${m + 1} time`);
			// Numerals should fill the 4-space stave height (within 0.35 spaces of each outer line).
			const fillsTop = Math.abs(time.y - top) <= 0.35 * sp;
			const fillsBottom = Math.abs(time.y + time.h - bottom) <= 0.35 * sp;
			return fillsTop && fillsBottom;
		});
		expect(e.check(results)).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('time-opening-not-repeated (p. 152): places time after clef and key at opening and omits it on unchanged new system', async () => {
		const e = await engrave('metre-time', 'time-opening-not-repeated');
		const clef = unionBox(e.inMeasure('clef', 0), 'M1 clef');
		const key = unionBox(keyInks(e, 0), 'M1 key');
		const time = unionBox(e.inMeasure('timesignature', 0), 'M1 time');
		const m2Time = e.inMeasure('timesignature', 1);
		markBox(e, clef, 'Clef');
		markBox(e, key, 'Key');
		markBox(e, time, 'Time');
		expect(
			e.check([
				clef.x + clef.w <= key.x,
				key.x + key.w <= time.x,
				m2Time.length === 0,
			]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('time-change-after-barline (p. 152): places a mid-system time-signature change after the barline', async () => {
		const e = await engrave('metre-time', 'time-change-after-barline');
		const time = unionBox(e.inMeasure('timesignature', 2), 'M3 time');
		const barX = e.measureRect(2).x;
		markBox(e, time, '12/16 after barline');
		expect(e.check(time.x > barX)).toMatchMeasurements(true);
	});

	it.concurrent('time-change-system-break (p. 152): prints a cautionary time signature after the closing barline at system end and the new time at the next system start', async () => {
		const e = await engrave('metre-time', 'time-change-system-break');
		// M4 (index 3) closes system 2 in 5/8 before M5 (index 4) opens system 3 in 2/4.
		const lastNote = must(
			e.inMeasure('notehead', 3).at(-1),
			'M4 last notehead',
		);
		const closingBar = unionBox(
			e.inMeasure('stavebarline', 3).filter((b) => b.box.x > lastNote.box.x),
			'M4 closing barline',
		);
		const caution = unionBox(
			e.inMeasure('timesignature', 3).filter((t) => t.box.x > lastNote.box.x),
			'M4 cautionary 2/4',
		);
		const m5Clef = unionBox(e.inMeasure('clef', 4), 'M5 clef');
		const m5Key = unionBox(keyInks(e, 4), 'M5 key');
		const m5Time = unionBox(e.inMeasure('timesignature', 4), 'M5 2/4');
		markBox(e, closingBar, 'M4 closing barline');
		markBox(e, caution, 'Cautionary 2/4 after barline');
		markBox(e, m5Time, 'M5 opening 2/4');
		expect(
			e.check([
				caution.x > closingBar.x + closingBar.w,
				m5Clef.x + m5Clef.w <= m5Key.x,
				m5Key.x + m5Key.w <= m5Time.x,
			]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('beam-feathered-converge (p. 158): spreads beams at the fast end and converges them at the slow end', async () => {
		const e = await engrave('metre-time', 'beam-feathered-converge');
		const beams = e.inMeasure('beam', 5);
		const sorted = [...beams].sort((a, b) => a.box.x - b.box.x);
		// M6 has two groups: first is rit (wide left, narrow right), second is accel (narrow left, wide right).
		const midX = e.measureRect(5).x + e.measureRect(5).w / 2;
		const ritInks = sorted.filter((b) => b.box.x + b.box.w / 2 < midX);
		const accelInks = sorted.filter((b) => b.box.x + b.box.w / 2 >= midX);
		const ritBox = unionBox(ritInks, 'rit feathered beams');
		const accelBox = unionBox(accelInks, 'accel feathered beams');
		markBox(e, ritBox, 'Rit fan');
		markBox(e, accelBox, 'Accel fan');
		const ritLeft = verticalSpanAt(ritInks, ritBox.x + 2);
		const ritRight = verticalSpanAt(ritInks, ritBox.x + ritBox.w - 2);
		const accelLeft = verticalSpanAt(accelInks, accelBox.x + 2);
		const accelRight = verticalSpanAt(accelInks, accelBox.x + accelBox.w - 2);
		expect(
			e.check([ritLeft > ritRight * 1.5, accelRight > accelLeft * 1.5]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('rest-horizontal-onset (p. 159): aligns rests with simultaneous notes in another stave', async () => {
		const e = await engrave('metre-rests', 'rest-horizontal-onset');
		const sp = e.space(0);
		const staff1Notes = staffNotes(e, 0, 1);
		const staff2Rests = staffRests(e, 0, 2);
		const diffs = [0, 1, 2].map((i) => {
			const note = must(staff1Notes[i], `M1 staff1 note ${i}`);
			const rest = must(staff2Rests[i], `M1 staff2 rest ${i}`);
			markBox(e, note.head, `Note ${i + 1}`);
			markBox(e, rest.box, `Rest ${i + 1}`);
			const noteCx = note.head.x + note.head.w / 2;
			const restCx = rest.box.x + rest.box.w / 2;
			return Math.abs(restCx - noteCx) <= 1.0 * sp;
		});
		expect(e.check(diffs)).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('rest-grace-align-main (p. 159): aligns rests with the measured main note rather than preceding grace notes', async () => {
		const e = await engrave('metre-rests', 'rest-grace-align-main');
		const sp = e.space(1);
		// Staff 1 has 2 grace notes + main note on beat 1, quarter on beat 2, 2 grace notes + main note on beat 3.
		const s1 = staffNotes(e, 1, 1);
		const s2Rests = staffRests(e, 1, 2);
		// Measured main notes are the non-grace notes (index 2 and index 6 in x-sorted staff 1 notes, or filter by head width).
		const fullWidth = Math.max(...s1.map((n) => n.head.w));
		const mainNotes = s1.filter((n) => n.head.w >= fullWidth * 0.85);
		const beat1Main = must(mainNotes[0], 'M2 beat 1 main');
		const beat3Main = must(mainNotes[2], 'M2 beat 3 main');
		const beat1Rest = must(s2Rests[0], 'M2 beat 1 rest');
		const beat3Rest = must(s2Rests[1], 'M2 beat 3 rest');
		markBox(e, beat1Main.head, 'Beat 1 main');
		markBox(e, beat1Rest.box, 'Beat 1 rest');
		markBox(e, beat3Main.head, 'Beat 3 main');
		markBox(e, beat3Rest.box, 'Beat 3 rest');
		const align1 =
			Math.abs(
				beat1Rest.box.x +
					beat1Rest.box.w / 2 -
					(beat1Main.head.x + beat1Main.head.w / 2),
			) <=
			1.0 * sp;
		const align3 =
			Math.abs(
				beat3Rest.box.x +
					beat3Rest.box.w / 2 -
					(beat3Main.head.x + beat3Main.head.w / 2),
			) <=
			1.0 * sp;
		expect(e.check([align1, align3])).toMatchMeasurements([true, true]);
	});

	it.concurrent('rest-whole-bar-centre (p. 159): centres a whole-bar rest visually even when the other part is rhythmically off-centre', async () => {
		const e = await engrave('metre-rests', 'rest-whole-bar-centre');
		const results = [2, 3].map((m) => {
			const sp = e.space(m);
			const rect = e.measureRect(m);
			const rest = must(staffRests(e, m, 2)[0], `M${m + 1} whole-bar rest`);
			// Visual blank space starts after any opening clef on system start (M3) or at measure left (M4).
			const clef = e.inMeasure('clef', m);
			const leftEdge =
				clef.length > 0
					? Math.max(...clef.map((c) => c.box.x + c.box.w))
					: rect.x;
			const rightEdge = rect.x + rect.w;
			const visualMid = (leftEdge + rightEdge) / 2;
			const restCx = rest.box.x + rest.box.w / 2;
			markBox(e, rest.box, `M${m + 1} whole-bar rest`);
			return Math.abs(restCx - visualMid) <= 1.5 * sp;
		});
		expect(e.check(results)).toMatchMeasurements([true, true]);
	});

	it.concurrent('rest-whole-bar-signatures (p. 160): centres a whole-bar rest in the blank space after signatures or before a trailing clef', async () => {
		const e = await engrave('metre-whole-rests', 'rest-whole-bar-signatures');
		// M1: clef + 3 flats + 3/4 + whole-bar rest.
		const sp0 = e.space(0);
		const r0 = e.measureRect(0);
		const time0 = unionBox(e.inMeasure('timesignature', 0), 'M1 time');
		const rest0 = must(staffRests(e, 0, 1)[0], 'M1 rest');
		const mid0 = (time0.x + time0.w + (r0.x + r0.w)) / 2;
		const ok0 = Math.abs(rest0.box.x + rest0.box.w / 2 - mid0) <= 1.25 * sp0;
		markBox(e, rest0.box, 'M1 rest');

		// M2: whole-bar rest + trailing courtesy bass clef.
		const sp1 = e.space(1);
		const r1 = e.measureRect(1);
		const clefs1 = e.inMeasure('clef', 1);
		const trailingClefX =
			clefs1.length > 0 ? Math.min(...clefs1.map((c) => c.box.x)) : r1.x + r1.w;
		const rest1 = must(staffRests(e, 1, 1)[0], 'M2 rest');
		const mid1 = (r1.x + trailingClefX) / 2;
		const ok1 = Math.abs(rest1.box.x + rest1.box.w / 2 - mid1) <= 1.25 * sp1;
		markBox(e, rest1.box, 'M2 rest');
		expect(e.check([ok0, ok1])).toMatchMeasurements([true, true]);
	});

	it.concurrent('rest-whole-bar-breve (p. 160): draws hanging semibreve rests below 4/2 and centred breve rests in 4/2 and larger', async () => {
		const e = await engrave('metre-whole-rests', 'rest-whole-bar-breve');
		const semibreves = [3, 4, 5].map((m) => {
			const sp = e.space(m);
			const topLine = must(e.lines(m)[0], `M${m + 1} top line`);
			const rest = must(staffRests(e, m, 1)[0], `M${m + 1} rest`);
			const top = quarters(rest.box.y - topLine, sp);
			const bottom = quarters(rest.box.y + rest.box.h - topLine, sp);
			markBox(e, rest.box, `M${m + 1} semibreve`);
			return top === 1 && bottom < 2;
		});
		const breves = [6, 7].map((m) => {
			const sp = e.space(m);
			const rect = e.measureRect(m);
			const topLine = must(e.lines(m)[0], `M${m + 1} top line`);
			const rest = must(staffRests(e, m, 1)[0], `M${m + 1} rest`);
			const time = unionBox(
				e.inMeasure('timesignature', m).filter((t) => t.box.x < rest.box.x),
				`M${m + 1} time`,
			);
			const closingBars = e
				.inMeasure('stavebarline', m)
				.filter((b) => b.box.x > rest.box.x);
			const rightEdge =
				closingBars.length > 0
					? Math.min(...closingBars.map((b) => b.box.x))
					: rect.x + rect.w;
			const top = quarters(rest.box.y - topLine, sp);
			const bottom = quarters(rest.box.y + rest.box.h - topLine, sp);
			const mid = (time.x + time.w + rightEdge) / 2;
			const centred = Math.abs(rest.box.x + rest.box.w / 2 - mid) <= 1.25 * sp;
			markBox(e, rest.box, `M${m + 1} breve`);
			return top === 1 && bottom === 2 && centred;
		});
		expect(e.check([...semibreves, ...breves])).toMatchMeasurements([
			true,
			true,
			true,
			true,
			true,
		]);
	});

	it.concurrent('rest-semibreve-half-bar (p. 160): places a half-bar semibreve rest in 4/2 at the start of its duration rather than centred', async () => {
		const e = await engrave('metre-whole-rests', 'rest-semibreve-half-bar');
		const m = 8;
		const rect = e.measureRect(m);
		const time = unionBox(e.inMeasure('timesignature', m), 'M9 time');
		const rest = must(staffRests(e, m, 1)[0], 'M9 semibreve rest');
		const notes = staffNotes(e, m, 1);
		const firstNote = must(notes[0], 'M9 first half note');
		const blankStart = time.x + time.w;
		const blankMid = (blankStart + rect.x + rect.w) / 2;
		const restCx = rest.box.x + rest.box.w / 2;
		markBox(e, rest.box, 'Half-bar semibreve rest');
		markBox(e, firstNote.head, 'First half note');
		// Rest should sit well left of the bar's visual centre and before the first half note.
		expect(
			e.check([restCx < blankMid - e.space(m), restCx < firstNote.head.x]),
		).toMatchMeasurements([true, true]);
	});
});

function keyInks(e: Engraving, measure: number): Ink[] {
	return [
		...e.inMeasure('keysignature', measure),
		...e.inMeasure('accidental', measure),
	].filter((ink) => {
		const notes = e.inMeasure('notehead', measure);
		const firstNoteX =
			notes.length > 0 ? Math.min(...notes.map((n) => n.box.x)) : Infinity;
		return ink.box.x < firstNoteX;
	});
}

function staffNotes(e: Engraving, measure: number, staff: number) {
	const lines = e.lines(measure, 0, staff);
	const sp = e.space(measure, 0);
	const top = must(lines[0], 'top line') - 4 * sp;
	const bottom = must(lines[4], 'bottom line') + 4 * sp;
	return e.notes
		.filter(
			(n) =>
				n.measure === measure &&
				n.pitch !== null &&
				n.cy >= top &&
				n.cy <= bottom,
		)
		.sort((a, b) => a.head.x - b.head.x);
}

function staffRests(e: Engraving, measure: number, staff: number): Ink[] {
	const rect = e.measureRect(measure);
	const lines = e.lines(measure, 0, staff);
	const sp = e.space(measure, 0);
	const top = must(lines[0], 'top line') - 3 * sp;
	const bottom = must(lines[4], 'bottom line') + 3 * sp;
	return e
		.of('rest')
		.filter((r) => {
			const cx = r.box.x + r.box.w / 2;
			const cy = r.box.y + r.box.h / 2;
			return cx >= rect.x && cx < rect.x + rect.w && cy >= top && cy <= bottom;
		})
		.sort((a, b) => a.box.x - b.box.x);
}

function unionBox(inks: Ink[], label: string): Box {
	const first = must(inks[0], label);
	let left = first.box.x;
	let top = first.box.y;
	let right = first.box.x + first.box.w;
	let bottom = first.box.y + first.box.h;
	for (const ink of inks.slice(1)) {
		left = Math.min(left, ink.box.x);
		top = Math.min(top, ink.box.y);
		right = Math.max(right, ink.box.x + ink.box.w);
		bottom = Math.max(bottom, ink.box.y + ink.box.h);
	}
	return { x: left, y: top, w: right - left, h: bottom - top };
}

function verticalSpanAt(inks: Ink[], x: number): number {
	const rx = Math.round(x);
	let minY = Infinity;
	let maxY = -Infinity;
	for (const ink of inks) {
		for (const [top, bottom] of ink.bandsAt(rx)) {
			if (top < minY) {
				minY = top;
			}
			if (bottom > maxY) {
				maxY = bottom;
			}
		}
	}
	return maxY >= minY ? maxY - minY : 0;
}
