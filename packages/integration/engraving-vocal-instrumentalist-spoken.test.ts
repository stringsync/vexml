import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { bottomEdge } from './engraving-spanners';

describe('Behind Bars instrumentalist spoken line (p. 461)', () => {
	it.concurrent('draws an instrumentalist single-line spoken part above a five-line playing stave', async () => {
		expect(await draw('vocal-instrumentalist-spoken')).toMatchScreenshot(
			'engraving_vocal-instrumentalist-spoken.png',
		);
	});

	it.concurrent('vocal-instrumentalist-spoken-line (p. 461): keeps spoken lyrics clear above the playing stave and dynamics below it', async () => {
		const e = await engrave(
			'vocal-instrumentalist-spoken',
			'vocal-instrumentalist-spoken-line',
		);
		const spokenLineY = must(e.lines(0, 0, 1)[0], 'spoken single line');
		const celloLines = e.lines(0, 0, 2);
		const celloTop = must(celloLines[0], 'cello top line');
		const celloBottom = must(celloLines.at(-1), 'cello bottom line');
		const m1 = e.measureRect(0);
		const spokenNotes = e.notes.filter(
			(n) => n.measure === 0 && n.voice === '1' && n.ink !== undefined,
		);
		const spokenLyricsClear =
			spokenNotes.length >= 3 &&
			spokenNotes.some((n) => {
				const ink = must(n.ink, 'spoken note ink');
				return bottomEdge(ink) > spokenLineY + 15 && bottomEdge(ink) < celloTop;
			}) &&
			spokenNotes.every(
				(n) => bottomEdge(must(n.ink, 'spoken note ink')) < celloTop,
			);
		for (const n of spokenNotes) {
			if (n.ink) {
				markBox(e, n.ink, 'Spoken note + lyric');
			}
		}
		const belowCello = e.inks.filter(
			(ink) =>
				ink.kind === 'words' &&
				ink.box.x >= m1.x &&
				ink.box.x < m1.x + m1.w &&
				ink.box.y > celloBottom,
		);
		for (const t of belowCello) {
			markBox(e, t.box, 'Played dynamic');
		}
		const ok = spokenLyricsClear && belowCello.length >= 2;
		expect(e.check(ok)).toMatchMeasurements(true);
	});
});
