import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { onStave } from './engraving-spanners';

describe('Behind Bars tempo indications and equations', () => {
	it.concurrent('draws tempo indications, alignments, dashes, and tempo equations', async () => {
		expect(await draw('tempo-indications')).toMatchScreenshot(
			'engraving_tempo-indications.png',
		);
	});

	it.concurrent('draws complex tempo equations with arrows, ties, and tuplets', async () => {
		expect(await draw('tempo-equations-complex')).toMatchScreenshot(
			'engraving_tempo-equations-complex.png',
		);
	});

	it.concurrent('tempo-design-bold-roman (p. 182): prints tempo indications in bold roman type larger than ordinary text', async () => {
		const e = await engrave('tempo-indications', 'tempo-design-bold-roman');
		const allegro = must(onStave(e, 'words', 0, 8, 2)[0], 'Allegro');
		const presto = must(onStave(e, 'words', 2, 8, 2)[0], 'Presto');
		const accel = must(onStave(e, 'words', 7, 8, 2)[0], 'accel.');
		markBox(e, allegro.box, 'Allegro');
		markBox(e, presto.box, 'Presto');
		expect(
			e.check([allegro.box.h > accel.box.h, presto.box.h > accel.box.h]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tempo-above-all-marks (p. 182): places tempo indications above 8va brackets, slurs, and articulations with no overlap', async () => {
		const e = await engrave('tempo-indications', 'tempo-above-all-marks');
		const allegro = must(onStave(e, 'words', 0, 10, 2)[0], 'Allegro');
		const ottava = must(onStave(e, 'bracket', 0, 10, 2)[0], '8va bracket');
		const slur = must(onStave(e, 'slur', 0, 10, 2)[0], 'slur');
		markBox(e, allegro.box, 'Allegro');
		markBox(e, ottava.box, '8va');
		expect(
			e.check([
				allegro.box.y + allegro.box.h < ottava.box.y,
				allegro.box.y + allegro.box.h < slur.box.y,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tempo-align-time-signature (p. 183): aligns bar-opening tempo and metronome marks with a coinciding time signature', async () => {
		const e = await engrave('tempo-indications', 'tempo-align-time-signature');
		const allegro = must(onStave(e, 'words', 0, 10, 2)[0], 'Allegro');
		const time1Inks = e.inMeasure('timesignature', 0);
		expect(time1Inks.length).toBeGreaterThan(0);
		const time1 = {
			x: Math.min(...time1Inks.map((t) => t.box.x)),
			y: Math.min(...time1Inks.map((t) => t.box.y)),
			w:
				Math.max(...time1Inks.map((t) => t.box.x + t.box.w)) -
				Math.min(...time1Inks.map((t) => t.box.x)),
			h:
				Math.max(...time1Inks.map((t) => t.box.y + t.box.h)) -
				Math.min(...time1Inks.map((t) => t.box.y)),
		};
		const top2 = must(e.lines(1)[0], 'M2 top stave line');
		const rect2 = e.measureRect(1);
		const metroMarks = e.inks.filter(
			(ink) =>
				ink.box.y + ink.box.h < top2 &&
				centre(ink.box) >= rect2.x &&
				centre(ink.box) <= rect2.x + rect2.w,
		);
		expect(metroMarks.length).toBeGreaterThan(0);
		const metro = {
			x: Math.min(...metroMarks.map((m) => m.box.x)),
			y: Math.min(...metroMarks.map((m) => m.box.y)),
			w:
				Math.max(...metroMarks.map((m) => m.box.x + m.box.w)) -
				Math.min(...metroMarks.map((m) => m.box.x)),
			h:
				Math.max(...metroMarks.map((m) => m.box.y + m.box.h)) -
				Math.min(...metroMarks.map((m) => m.box.y)),
		};
		const time2Inks = e.inMeasure('timesignature', 1);
		expect(time2Inks.length).toBeGreaterThan(0);
		const time2 = {
			x: Math.min(...time2Inks.map((t) => t.box.x)),
			y: Math.min(...time2Inks.map((t) => t.box.y)),
			w:
				Math.max(...time2Inks.map((t) => t.box.x + t.box.w)) -
				Math.min(...time2Inks.map((t) => t.box.x)),
			h:
				Math.max(...time2Inks.map((t) => t.box.y + t.box.h)) -
				Math.min(...time2Inks.map((t) => t.box.y)),
		};
		markBox(e, allegro.box, 'Allegro');
		markBox(e, time1, '3/4');
		markBox(e, metro, 'quarter = 96');
		markBox(e, time2, '4/4');
		expect(
			e.check([
				Math.abs(allegro.box.x - time1.x) <= 0.5 * e.space(0),
				Math.abs(metro.x - time2.x) <= 0.5 * e.space(1),
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tempo-align-first-note (p. 183): aligns a bar-opening tempo marking with the first notational element rather than the barline', async () => {
		const e = await engrave('tempo-indications', 'tempo-align-first-note');
		const words = onStave(e, 'words', 2, 8, 2);
		const presto = must(words[0], 'Presto');
		const rect = e.measureRect(2);
		const first = must(e.headsIn(2)[0], 'first note').head;
		const space = e.space(2);
		markBox(e, presto.box, 'Presto');
		expect(
			e.check([
				presto.box.x > rect.x + 0.5 * space,
				Math.abs(presto.box.x - first.x) <= 1.5 * space,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tempo-align-midbar (p. 183): aligns a mid-bar tempo indication with the first notational element of its beat', async () => {
		const e = await engrave('tempo-indications', 'tempo-align-midbar');
		const words = onStave(e, 'words', 3, 8, 2);
		const vivace = must(words[0], 'Vivace');
		const beat3 = must(e.headsIn(3)[1], 'G#4 on beat 3').head;
		const space = e.space(3);
		markBox(e, vivace.box, 'Vivace');
		expect(
			e.check(Math.abs(vivace.box.x - beat3.x) <= 1.5 * space),
		).toMatchMeasurements(true);
	});

	it.concurrent('tempo-align-repeat (p. 183): aligns tempo with first note after a barline repeat sign, and with the repeat sign when it opens a system', async () => {
		const e = await engrave('tempo-indications', 'tempo-align-repeat');
		const piuMosso = must(onStave(e, 'words', 4, 8, 2)[0], 'Più mosso');
		const m5Rect = e.measureRect(4);
		const m5Head = must(e.headsIn(4)[0], 'M5 first note').head;
		const m5Space = e.space(4);

		const animando = must(onStave(e, 'words', 5, 8, 2)[0], 'Animando');
		const m6Rect = e.measureRect(5);
		const m6Head = must(e.headsIn(5)[0], 'M6 first note').head;
		const m6Space = e.space(5);
		const m6Barline = must(
			e.inMeasure('stavebarline', 5).find((ink) => ink.box.x < m6Head.x),
			'M6 repeat barline',
		);
		const repeatBars = m6Barline
			.segmentsAt(Math.round(e.middle(5)))
			.filter(([left]) => left > m6Rect.x + 2 * m6Space && left < m6Head.x);
		expect(repeatBars.length).toBeGreaterThan(0);
		const repeatLeft = must(repeatBars[0], 'M6 repeat heavy bar')[0];
		const repeatRight = must(repeatBars.at(-1), 'M6 repeat thin bar')[1];
		const repeatBox = {
			x: repeatLeft,
			y: m6Barline.box.y,
			w: repeatRight - repeatLeft,
			h: m6Barline.box.h,
		};

		markBox(e, piuMosso.box, 'Più mosso');
		markBox(e, animando.box, 'Animando');
		markBox(e, repeatBox, 'Repeat sign');
		expect(
			e.check([
				piuMosso.box.x > m5Rect.x + m5Space,
				Math.abs(piuMosso.box.x - m5Head.x) <= 1.5 * m5Space,
				Math.abs(animando.box.x - repeatLeft) <= 0.5 * m6Space,
				animando.box.x < m6Head.x - 0.5 * m6Space,
			]),
		).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('tempo-metronome-brackets (p. 183): places a bracketed metronome mark inline on the same line immediately after its tempo word', async () => {
		const e = await engrave('tempo-indications', 'tempo-metronome-brackets');
		const tempoI = must(onStave(e, 'words', 6, 8, 2)[0], 'Tempo I');
		const top = must(e.lines(6)[0], 'M7 top stave line');
		const rect = e.measureRect(6);
		const space = e.space(6);
		const metroMarks = e.inks.filter(
			(ink) =>
				ink.kind !== 'words' &&
				ink.box.y >= top - 8 * space &&
				ink.box.y + ink.box.h < top &&
				centre(ink.box) >= rect.x &&
				centre(ink.box) <= rect.x + rect.w,
		);
		expect(metroMarks.length).toBeGreaterThan(0);
		const metro = {
			x: Math.min(...metroMarks.map((m) => m.box.x)),
			y: Math.min(...metroMarks.map((m) => m.box.y)),
			w:
				Math.max(...metroMarks.map((m) => m.box.x + m.box.w)) -
				Math.min(...metroMarks.map((m) => m.box.x)),
			h:
				Math.max(...metroMarks.map((m) => m.box.y + m.box.h)) -
				Math.min(...metroMarks.map((m) => m.box.y)),
		};
		const wordsRight = tempoI.box.x + tempoI.box.w;
		const wordsBottom = tempoI.box.y + tempoI.box.h;
		const metroBottom = metro.y + metro.h;
		markBox(e, tempoI.box, 'Tempo I');
		markBox(e, metro, '(quarter = 72)');
		expect(
			e.check([
				metro.x > wordsRight,
				metro.x - wordsRight <= 1.5 * space,
				Math.abs(metroBottom - wordsBottom) <= 0.75 * space,
			]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('tempo-dashes-horizontal (p. 184): keeps gradual tempo-alteration dashes horizontal across contrasting note heights', async () => {
		const e = await engrave('tempo-indications', 'tempo-dashes-horizontal');
		const dashes = e.of('dashes');
		expect(dashes.length).toBeGreaterThan(0);
		const dash = must(dashes[0], 'tempo dashes');
		const space = e.space(7);
		markBox(e, dash.box, 'Dashes');
		expect(e.check(dash.box.h <= 0.5 * space)).toMatchMeasurements(true);
	});

	it.concurrent('tempo-dashes-notch (p. 185): terminates a dashed tempo-alteration bracket with a downward vertical notch', async () => {
		const e = await engrave('tempo-indications', 'tempo-dashes-notch');
		const brackets = onStave(e, 'bracket', 9, 8, 2);
		const bracket = must(brackets[0], 'dashed bracket with notch');
		const space = e.space(9);
		markBox(e, bracket.box, 'Notched dashes');
		expect(
			e.check([bracket.box.h >= 0.4 * space, bracket.box.w >= 0.5 * space]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('tempo-equation-over-barline (p. 185): centres the equals sign of a tempo equation over the barline', async () => {
		const e = await engrave('tempo-indications', 'tempo-equation-over-barline');
		const top = must(e.lines(11)[0], 'M12 top stave line');
		const rect = e.measureRect(11);
		const space = e.space(11);
		const marks = e.inks.filter(
			(ink) =>
				ink.box.y >= top - 6 * space &&
				ink.box.y + ink.box.h < top &&
				centre(ink.box) >= rect.x - 4 * space &&
				centre(ink.box) <= rect.x + 4 * space,
		);
		expect(marks.length).toBeGreaterThan(0);
		const eqLeft = Math.min(...marks.map((m) => m.box.x));
		const eqRight = Math.max(...marks.map((m) => m.box.x + m.box.w));
		const eqTop = Math.min(...marks.map((m) => m.box.y));
		const eqBottom = Math.max(...marks.map((m) => m.box.y + m.box.h));
		const eqBox = {
			x: eqLeft,
			y: eqTop,
			w: eqRight - eqLeft,
			h: eqBottom - eqTop,
		};
		const equals = must(
			marks.reduce((shortest, m) => (m.box.h < shortest.box.h ? m : shortest)),
			'equals sign',
		);
		markBox(e, eqBox, 'half = quarter');
		markBox(e, equals.box, '=');
		expect(
			e.check([
				eqLeft < rect.x,
				eqRight > rect.x,
				Math.abs(centre(equals.box) - rect.x) <= 0.35 * space,
			]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('tempo-equation-arrows (p. 186): draws outward arrows flanking a tempo equation', async () => {
		const e = await engrave('tempo-equations-complex', 'tempo-equation-arrows');
		const top = must(e.lines(0)[0], 'top stave line');
		const rect = e.measureRect(0);
		const marks = e.inks.filter(
			(ink) =>
				ink.box.y + ink.box.h < top &&
				centre(ink.box) >= rect.x &&
				centre(ink.box) <= rect.x + rect.w,
		);
		const left = Math.min(...marks.map((m) => m.box.x));
		const right = Math.max(...marks.map((m) => m.box.x + m.box.w));
		const minY = Math.min(...marks.map((m) => m.box.y));
		const maxY = Math.max(...marks.map((m) => m.box.y + m.box.h));
		markBox(
			e,
			{ x: left, y: minY, w: right - left, h: maxY - minY },
			'Equation with arrows',
		);
		expect(e.check(right - left >= 4 * e.space(0))).toMatchMeasurements(true);
	});

	it.concurrent('tempo-equation-complex (pp. 186-187): draws tied notes and a bracketed tuplet in a complex tempo equation', async () => {
		const e = await engrave(
			'tempo-equations-complex',
			'tempo-equation-complex',
		);
		const top = must(e.lines(1)[0], 'top stave line');
		const rect = e.measureRect(1);
		const marks = e.inks.filter(
			(ink) =>
				ink.box.y + ink.box.h < top &&
				centre(ink.box) >= rect.x - 4 * e.space(1) &&
				centre(ink.box) <= rect.x + rect.w,
		);
		const left = Math.min(...marks.map((m) => m.box.x));
		const right = Math.max(...marks.map((m) => m.box.x + m.box.w));
		const minY = Math.min(...marks.map((m) => m.box.y));
		const maxY = Math.max(...marks.map((m) => m.box.y + m.box.h));
		markBox(
			e,
			{ x: left, y: minY, w: right - left, h: maxY - minY },
			'Complex equation',
		);
		expect(e.check(right - left >= 5 * e.space(1))).toMatchMeasurements(true);
	});
});
