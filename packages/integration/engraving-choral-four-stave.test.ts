import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { bottomEdge } from './engraving-spanners';

describe('Behind Bars choral staves, brackets, barlines, and dynamics (pp. 462–465)', () => {
	it.concurrent('draws solo soprano above bracketed choir staves with separate barlines and above-stave dynamics', async () => {
		expect(await draw('choral-four-stave')).toMatchScreenshot(
			'engraving_choral-four-stave.png',
		);
	});

	it.concurrent('choral-stave-brackets (pp. 462–464): joins choir staves with a square bracket while leaving solo stave unbracketed', async () => {
		const e = await engrave('choral-four-stave', 'choral-stave-brackets');
		const p0Lines = e.lines(0, 0, 1);
		const p1Lines = e.lines(0, 1, 1);
		const p2Lines = e.lines(0, 2, 1);
		const p0Top = must(p0Lines[0], 'solo top line');
		const p0Bottom = must(p0Lines.at(-1), 'solo bottom line');
		const p1Top = must(p1Lines[0], 'soprano top line');
		const p2Bottom = must(p2Lines.at(-1), 'alto bottom line');
		const m0 = e.measureRect(0);
		const leftInks = e.inks.filter(
			(ink) => ink.box.x < m0.x + 15 && ink.box.h > 80,
		);
		const choirBracket = leftInks.find(
			(ink) =>
				ink.box.y > p0Bottom &&
				ink.box.y <= p1Top + 5 &&
				bottomEdge(ink.box) >= p2Bottom - 5,
		);
		const systemicLine = leftInks.find(
			(ink) => ink.box.y <= p0Top + 5 && bottomEdge(ink.box) >= p2Bottom - 5,
		);
		if (choirBracket) {
			markBox(e, choirBracket.box, 'Choir square bracket');
		}
		if (systemicLine) {
			markBox(e, systemicLine.box, 'Systemic barline');
		}
		const ok = choirBracket !== undefined && systemicLine !== undefined;
		expect(e.check(ok)).toMatchMeasurements(true);
	});

	it.concurrent('choral-barlines-separate (p. 463): keeps interior barlines separate on each vocal stave', async () => {
		const e = await engrave('choral-four-stave', 'choral-barlines-separate');
		const p0Bottom = must(e.lines(0, 0, 1).at(-1), 'solo bottom');
		const p1Top = must(e.lines(0, 1, 1)[0], 'soprano top');
		const p1Bottom = must(e.lines(0, 1, 1).at(-1), 'soprano bottom');
		const p2Top = must(e.lines(0, 2, 1)[0], 'alto top');
		const m0 = e.measureRect(0);
		const boundaryX = m0.x + m0.w;
		const spanningGap = e.inks.filter(
			(ink) =>
				ink.box.w <= 12 &&
				Math.abs(ink.box.x + ink.box.w / 2 - boundaryX) < 12 &&
				((ink.box.y <= p0Bottom && bottomEdge(ink.box) >= p1Top) ||
					(ink.box.y <= p1Bottom && bottomEdge(ink.box) >= p2Top)),
		);
		markBox(
			e,
			{ x: boundaryX - 4, y: p0Bottom + 2, w: 8, h: p1Top - p0Bottom - 4 },
			'Gap 1 clear',
		);
		markBox(
			e,
			{ x: boundaryX - 4, y: p1Bottom + 2, w: 8, h: p2Top - p1Bottom - 4 },
			'Gap 2 clear',
		);
		expect(e.check(spanningGap.length === 0)).toMatchMeasurements(true);
	});

	it.concurrent('choral-dynamics-above-clear-text (p. 465): keeps above-stave dynamics clear of lyrics above', async () => {
		const e = await engrave(
			'choral-four-stave',
			'choral-dynamics-above-clear-text',
		);
		const p0Bottom = must(e.lines(0, 0, 1).at(-1), 'solo bottom');
		const p1Top = must(e.lines(0, 1, 1)[0], 'soprano top');
		const p1Bottom = must(e.lines(0, 1, 1).at(-1), 'soprano bottom');
		const p2Top = must(e.lines(0, 2, 1)[0], 'alto top');
		const p0LyricBottom = Math.max(
			...e
				.headsIn(0, 0)
				.map((n) => bottomEdge(must(n.ink, 'solo note+lyric ink'))),
		);
		const p1LyricBottom = Math.max(
			...e
				.headsIn(0, 1)
				.map((n) => bottomEdge(must(n.ink, 'soprano note+lyric ink'))),
		);
		const m0 = e.measureRect(0);
		const sopranoDyn = e.inks.find(
			(ink) =>
				ink.kind === 'words' &&
				ink.box.x >= m0.x &&
				ink.box.x < m0.x + m0.w &&
				ink.box.y > p0Bottom &&
				bottomEdge(ink.box) < p1Top,
		);
		const altoDyn = e.inks.find(
			(ink) =>
				ink.kind === 'words' &&
				ink.box.x >= m0.x &&
				ink.box.x < m0.x + m0.w &&
				ink.box.y > p1Bottom &&
				bottomEdge(ink.box) < p2Top,
		);
		if (sopranoDyn) {
			markBox(e, sopranoDyn.box, 'Soprano dynamic');
		}
		if (altoDyn) {
			markBox(e, altoDyn.box, 'Alto dynamic');
		}
		const ok =
			sopranoDyn !== undefined &&
			altoDyn !== undefined &&
			sopranoDyn.box.y > p0LyricBottom &&
			altoDyn.box.y > p1LyricBottom;
		expect(e.check(ok)).toMatchMeasurements(true);
	});
});
