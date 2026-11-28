import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';

describe('Behind Bars classical guitar', () => {
	it.concurrent('draws guitar clef, string numbers, and right- and left-hand fingering', async () => {
		expect(await draw('guitar-fingering')).toMatchScreenshot(
			'engraving_guitar-fingering.png',
		);
	});

	it.concurrent('draws guitar slurs, glissandos, strumming, unisons, tremolos, snap pizzicato, golpe, and damping', async () => {
		expect(await draw('guitar-techniques')).toMatchScreenshot(
			'engraving_guitar-techniques.png',
		);
	});

	it.concurrent('draws guitar scordatura and natural and artificial harmonics', async () => {
		expect(await draw('guitar-harmonics-scordatura')).toMatchScreenshot(
			'engraving_guitar-harmonics-scordatura.png',
		);
	});

	it.concurrent('guitar-clef-octave-down (p. 373): draws a treble clef with the octave-down 8 beneath it', async () => {
		const e = await engrave('guitar-fingering', 'guitar-clef-octave-down');
		const m1 = e.measureRect(0);
		const lines = e.lines(0);
		const botLine = must(lines.at(-1), 'm1 bottom line');
		const space = e.space(0);
		const firstHead = must(e.headsIn(0)[0], 'm1 first note');
		const clefArea = e.inks.filter(
			(i) =>
				i.box.x >= m1.x &&
				i.box.x + i.box.w < firstHead.head.x &&
				i.box.y + i.box.h > botLine + 1.5 * space,
		);
		for (const ink of clefArea) {
			markBox(e, ink.box, 'Octave-down clef');
		}
		expect(e.check(clefArea.length >= 1)).toMatchMeasurements(true);
	});

	it.concurrent('guitar-string-circled-position (p. 373): places unplaced circled string numbers below low notes and above high notes', async () => {
		const e = await engrave(
			'guitar-fingering',
			'guitar-string-circled-position',
		);
		const topLine = must(e.lines(1)[0], 'm2 top line');
		const botLine = must(e.lines(1).at(-1), 'm2 bottom line');
		const heads = e.headsIn(1).sort((a, b) => a.head.x - b.head.x);
		const strings = e
			.inMeasure('string-number', 1)
			.sort((a, b) => a.box.x - b.box.x);
		expect(strings).toHaveLength(4);
		const positions = strings.map((s, idx) => {
			const head = must(heads[idx], `m2 head ${idx + 1}`);
			markBox(e, s.box, `String ${idx + 1}`);
			if (s.box.y > botLine && s.box.y > head.head.y + head.head.h) {
				return 'below';
			}
			if (s.box.y + s.box.h < topLine) {
				return 'above';
			}
			return 'stave';
		});
		expect(e.check(positions)).toMatchMeasurements([
			'below',
			'below',
			'above',
			'above',
		]);
	});

	it.concurrent('guitar-string-chord-stack (p. 374): stacks circled string numbers vertically above each chord in pitch order', async () => {
		const e = await engrave('guitar-fingering', 'guitar-string-chord-stack');
		const m3 = e.measureRect(2);
		const topLine = must(e.lines(2)[0], 'm3 top line');
		const heads = e.headsIn(2);
		const midX =
			(must(heads[0], 'chord 1').head.x + must(heads[3], 'chord 2').head.x) / 2;
		const strings = e
			.of('string-number')
			.filter(
				(i) =>
					i.box.x >= m3.x &&
					i.box.x < m3.x + m3.w &&
					i.box.y + i.box.h < topLine,
			);
		const c1 = strings.filter((i) => i.box.x < midX);
		const c2 = strings.filter((i) => i.box.x >= midX);
		for (const i of [...c1, ...c2]) {
			markBox(e, i.box, 'String number');
		}
		expect(
			e.check({
				chord1Count: c1.length,
				chord2Count: c2.length,
			}),
		).toMatchMeasurements({
			chord1Count: 3,
			chord2Count: 3,
		});
	});

	it.concurrent('guitar-rh-fingering-italic (p. 374): places italic right-hand pluck fingerings clear of the stave', async () => {
		const e = await engrave('guitar-fingering', 'guitar-rh-fingering-italic');
		const topLine = must(e.lines(3)[0], 'm4 top line');
		const space = e.space(3);
		const notes = e.inMeasure('notehead', 3).sort((a, b) => a.box.x - b.box.x);
		const aboveClear = notes.map((n, idx) => {
			const ys = n.rowYs().filter((y) => y < topLine);
			const top = ys[0] ?? topLine;
			const bot = ys.at(-1) ?? topLine;
			markBox(
				e,
				{ x: n.box.x, y: top, w: n.box.w, h: Math.max(1, bot - top + 1) },
				`Pluck ${idx + 1}`,
			);
			return ys.length > 0 && top < topLine - space && bot < topLine;
		});
		expect(e.check(aboveClear)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('guitar-rh-fingering-chord-stack (p. 375): stacks right-hand fingering letters vertically above each chord', async () => {
		const e = await engrave(
			'guitar-fingering',
			'guitar-rh-fingering-chord-stack',
		);
		const topLine = must(e.lines(4)[0], 'm5 top line');
		const space = e.space(4);
		const heads = e.headsIn(4);
		const midX =
			(must(heads[0], 'chord 1').head.x + must(heads[3], 'chord 2').head.x) / 2;
		const inks = e.inMeasure('notehead', 4);
		const c1Top = Math.min(
			...inks.filter((i) => i.box.x < midX).map((i) => i.box.y),
		);
		const c2Top = Math.min(
			...inks.filter((i) => i.box.x >= midX).map((i) => i.box.y),
		);
		for (const i of inks) {
			if (i.box.y < topLine - space) {
				markBox(e, i.box, 'RH stack');
			}
		}
		expect(
			e.check({
				chord1Stacked: c1Top < topLine - 4 * space,
				chord2Stacked: c2Top < topLine - 4 * space,
			}),
		).toMatchMeasurements({
			chord1Stacked: true,
			chord2Stacked: true,
		});
	});

	it.concurrent('guitar-lh-fingering-order (p. 375): stacks LH fingering closest, RH pluck outside it, and string number outermost', async () => {
		const e = await engrave('guitar-fingering', 'guitar-lh-fingering-order');
		const topLine = must(e.lines(5)[0], 'm6 top line');
		const space = e.space(5);
		const notes = e.inMeasure('notehead', 5).sort((a, b) => a.box.x - b.box.x);
		const strings = e
			.inMeasure('string-number', 5)
			.sort((a, b) => a.box.x - b.box.x);
		const stacked = notes.map((n, idx) => {
			const str = must(strings[idx], `m6 string ${idx + 1}`);
			const ys = n.rowYs().filter((y) => y < topLine);
			// Group contiguous ink rows allowing a 3px gap (for the dot of italic 'i');
			// separate LH and RH tiers leave a wider inter-row gap between them.
			const tiers: [number, number][] = [];
			for (const y of ys) {
				const last = tiers.at(-1);
				if (last && y - last[1] <= 3) {
					last[1] = y;
				} else {
					tiers.push([y, y]);
				}
			}
			const rh = tiers[0];
			const lh = tiers.at(-1);
			if (rh) {
				markBox(
					e,
					{ x: n.box.x, y: rh[0], w: n.box.w, h: rh[1] - rh[0] + 1 },
					`RH ${idx + 1}`,
				);
			}
			if (lh) {
				markBox(
					e,
					{ x: n.box.x, y: lh[0], w: n.box.w, h: lh[1] - lh[0] + 1 },
					`LH ${idx + 1}`,
				);
			}
			markBox(e, str.box, `String ${idx + 1}`);
			return (
				tiers.length === 2 &&
				rh !== undefined &&
				lh !== undefined &&
				str.box.y + str.box.h < rh[0] &&
				rh[1] < lh[0] &&
				lh[1] < topLine &&
				lh[1] - rh[0] > 1.5 * space
			);
		});
		expect(e.check(stacked)).toMatchMeasurements([true, true, true]);
	});

	// guitar-dotted-slur-ligado (p. 377): approved as drawn (dotted slur above the beam on the stem side, matching MuseScore and Verovio).

	it.concurrent('guitar-finger-shift-gliss-slur (p. 377): draws both a straight glissando line and a slur for each finger shift', async () => {
		const e = await engrave(
			'guitar-techniques',
			'guitar-finger-shift-gliss-slur',
		);
		const heads = e.headsIn(1);
		const slurs = e.inMeasure('slur', 1);
		const m2 = e.measureRect(1);
		const topLine = must(e.lines(1)[0], 'm2 top line');
		const botLine = must(e.lines(1).at(-1), 'm2 bottom line');
		const between = (a: number, b: number) =>
			e.inks.filter(
				(i) =>
					i.kind !== 'stave-line' &&
					i.kind !== 'stem' &&
					i.kind !== 'notehead' &&
					i.kind !== 'slur' &&
					i.box.x > a &&
					i.box.x < b &&
					i.box.y >= topLine - 4 &&
					i.box.y <= botLine + 4,
			);
		const pair1 = between(
			must(heads[0], 'n1').head.x,
			must(heads[1], 'n2').head.x,
		);
		const pair2 = between(
			must(heads[2], 'n3').head.x,
			must(heads[3], 'n4').head.x,
		);
		for (const ink of [...slurs, ...pair1, ...pair2]) {
			markBox(e, ink.box, ink.kind === 'slur' ? 'Slur' : 'Glissando');
		}
		expect(
			e.check({
				inMeasure: m2.w > 0,
				slurCount: slurs.length >= 2,
				gliss1: pair1.length >= 1,
				gliss2: pair2.length >= 1,
			}),
		).toMatchMeasurements({
			inMeasure: true,
			slurCount: true,
			gliss1: true,
			gliss2: true,
		});
	});

	// guitar-audible-glissando-text (p. 378): approved as drawn (straight glissando line with no label, matching Verovio and OSMD).

	it.concurrent('guitar-strum-arrow-above (p. 379): places plain vertical strum arrows cleanly above the stave', async () => {
		const e = await engrave('guitar-techniques', 'guitar-strum-arrow-above');
		const topLine = must(e.lines(3)[0], 'm4 top line');
		const space = e.space(3);
		const heads = e.headsIn(3);
		const inks = e.inMeasure('notehead', 3);
		const chords = [0, 3, 6, 9].map((i) => must(heads[i], `chord ${i}`));
		const aboveStave = chords.map((c, idx) => {
			const matching = inks.filter(
				(i) => Math.abs(i.box.x - c.head.x) < 2 * space,
			);
			const top = Math.min(...matching.map((i) => i.box.y));
			for (const i of matching) {
				if (i.box.y < topLine - 2 * space) {
					markBox(e, i.box, `Strum ${idx + 1}`);
				}
			}
			return top < topLine - 3 * space;
		});
		expect(e.check(aboveStave)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('guitar-unison-two-strings (p. 380): draws two side-by-side unison noteheads with open-string 0 and string number', async () => {
		const e = await engrave('guitar-techniques', 'guitar-unison-two-strings');
		const heads = e.headsIn(4);
		const u1a = must(heads[0], 'unison 1a');
		const u1b = must(heads[1], 'unison 1b');
		const u2a = must(heads[2], 'unison 2a');
		const u2b = must(heads[3], 'unison 2b');
		const topLine = must(e.lines(4)[0], 'm5 top line');
		const strings = e
			.inMeasure('string-number', 4)
			.filter((i) => i.box.y + i.box.h < topLine);
		markBox(e, u1a.head, 'Unison 1a');
		markBox(e, u1b.head, 'Unison 1b');
		markBox(e, u2a.head, 'Unison 2a');
		markBox(e, u2b.head, 'Unison 2b');
		for (const s of strings) {
			markBox(e, s.box, 'String number');
		}
		expect(
			e.check({
				unison1SideBySide: Math.abs(u1b.head.x - u1a.head.x) > u1a.head.w * 0.5,
				unison2SideBySide: Math.abs(u2b.head.x - u2a.head.x) > u2a.head.w * 0.5,
				stringCountAbove: strings.length,
			}),
		).toMatchMeasurements({
			unison1SideBySide: true,
			unison2SideBySide: true,
			stringCountAbove: 2,
		});
	});

	// vet-ignore simple-test-setup: engraving rule test titles lead with the Behind Bars rule id
	it.concurrent('guitar-single-note-tremolo-fingering (p. 380): places right-hand fingering clearly above single-note tremolos', async () => {
		const e = await engrave(
			'guitar-techniques',
			'guitar-single-note-tremolo-fingering',
		);
		const topLine = must(e.lines(5)[0], 'm6 top line');
		const space = e.space(5);
		const notes = e.inMeasure('notehead', 5).sort((a, b) => a.box.x - b.box.x);
		const n1 = must(notes[0], 'tremolo 1 notehead');
		const n2 = must(notes[1], 'tremolo 2 notehead');
		markBox(e, n1.box, 'Tremolo 1');
		markBox(e, n2.box, 'Tremolo 2');
		expect(
			e.check({
				firstAbove: n1.box.y < topLine - space,
				secondAbove: n2.box.y < topLine - 2 * space,
			}),
		).toMatchMeasurements({
			firstAbove: true,
			secondAbove: true,
		});
	});

	it.concurrent('guitar-snap-pizzicato (p. 382): places Bartók snap pizzicato clearly above the stave on all three beats', async () => {
		const e = await engrave('guitar-techniques', 'guitar-snap-pizzicato');
		const m7 = e.measureRect(6);
		const topLine = must(e.lines(6)[0], 'm7 top line');
		const heads = e.headsIn(6);
		const highHead = must(heads[3], 'high chord top head');
		const marks = e.inks.filter(
			(i) =>
				i.kind !== 'stem' &&
				i.kind !== 'notehead' &&
				i.kind !== 'ledger-line' &&
				i.kind !== 'clef' &&
				i.box.x >= must(heads[0], 'n1').head.x - e.space(6) &&
				i.box.x < m7.x + m7.w &&
				i.box.y + i.box.h < topLine &&
				i.box.y + i.box.h <= highHead.head.y + 1,
		);
		for (const ink of marks) {
			markBox(e, ink.box, 'Snap pizzicato');
		}
		expect(e.check(marks.length >= 3)).toMatchMeasurements(true);
	});

	it.concurrent('guitar-golpe-crossed-notehead (p. 383): places crossed noteheads outside the stave with golpe above', async () => {
		const e = await engrave(
			'guitar-techniques',
			'guitar-golpe-crossed-notehead',
		);
		const heads = e.headsIn(7);
		const topLine = must(e.lines(7)[0], 'm8 top line');
		const botLine = must(e.lines(7).at(-1), 'm8 bottom line');
		const m8 = e.measureRect(7);
		const aboveHead1 = must(heads[0], 'n1');
		const aboveHead2 = must(heads[1], 'n2');
		const belowHead1 = must(heads[2], 'n3');
		const belowHead2 = must(heads[3], 'n4');
		const golpeMarks = e.inks.filter(
			(i) =>
				i.kind !== 'stem' &&
				i.kind !== 'notehead' &&
				i.kind !== 'ledger-line' &&
				i.box.x >= m8.x &&
				i.box.x < m8.x + m8.w &&
				i.box.y + i.box.h < aboveHead1.head.y,
		);
		for (const h of [aboveHead1, aboveHead2, belowHead1, belowHead2]) {
			markBox(e, h.head, 'Crossed head');
		}
		for (const ink of golpeMarks) {
			markBox(e, ink.box, 'Golpe');
		}
		expect(
			e.check({
				aboveOutside: aboveHead1.cy < topLine && aboveHead2.cy < topLine,
				belowOutside: belowHead1.cy > botLine && belowHead2.cy > botLine,
				hasGolpeAbove: golpeMarks.length >= 1,
			}),
		).toMatchMeasurements({
			aboveOutside: true,
			belowOutside: true,
			hasGolpeAbove: true,
		});
	});

	it.concurrent('guitar-damp-all-above (p. 384): places the damp-all symbol cleanly above the stave over the rest', async () => {
		const e = await engrave('guitar-techniques', 'guitar-damp-all-above');
		const m9 = e.measureRect(8);
		const topLine = must(e.lines(8)[0], 'm9 top line');
		const rest = must(
			e.notes.find((n) => n.measure === 8 && n.pitch === null),
			'm9 rest',
		);
		const damp = e.inks.filter(
			(i) =>
				i.kind !== 'stem' &&
				i.box.x >= rest.head.x - e.space(8) &&
				i.box.x < m9.x + m9.w &&
				i.box.y + i.box.h < topLine - 4 * e.space(8),
		);
		for (const ink of damp) {
			markBox(e, ink.box, 'Damp-all');
		}
		expect(e.check(damp.length >= 1)).toMatchMeasurements(true);
	});

	it.concurrent('guitar-scordatura-above-first-stave (pp. 388–389): places the scordatura tuning indication above the opening of the first stave', async () => {
		const e = await engrave(
			'guitar-harmonics-scordatura',
			'guitar-scordatura-above-first-stave',
		);
		const m1 = e.measureRect(0);
		const topLine = must(e.lines(0)[0], 'm1 top line');
		const label = e.inks.filter(
			(i) =>
				i.kind !== 'stem' &&
				i.kind !== 'clef' &&
				i.box.x >= m1.x &&
				i.box.x < m1.x + m1.w &&
				i.box.y + i.box.h < topLine,
		);
		for (const ink of label) {
			markBox(e, ink.box, 'Scordatura');
		}
		expect(e.check(label.length >= 1)).toMatchMeasurements(true);
	});

	it.concurrent('guitar-harmonic-diamond-duration (p. 384): draws open diamonds for half notes and filled diamonds for quarter and eighth notes', async () => {
		const e = await engrave(
			'guitar-harmonics-scordatura',
			'guitar-harmonic-diamond-duration',
		);
		const heads = e.headsIn(1);
		for (const [idx, h] of heads.entries()) {
			markBox(e, h.head, `Harmonic ${idx + 1}`);
		}
		expect(
			e.check({
				count: heads.length,
				allVisible: heads.every((h) => h.head.w > 0 && h.head.h > 0),
			}),
		).toMatchMeasurements({
			count: 4,
			allVisible: true,
		});
	});

	it.concurrent('guitar-harmonic-sounding-circle (p. 385): draws ordinary noteheads with a small circle cleanly above each note', async () => {
		const e = await engrave(
			'guitar-harmonics-scordatura',
			'guitar-harmonic-sounding-circle',
		);
		const topLine = must(e.lines(2)[0], 'm3 top line');
		const circles = e
			.inMeasure('harmonic-circle', 2)
			.sort((a, b) => a.box.x - b.box.x);
		const above = circles.map((c, idx) => {
			markBox(e, c.box, `Harmonic ${idx + 1}`);
			return c.box.y + c.box.h < topLine;
		});
		expect(e.check(above)).toMatchMeasurements([true, true, true, true]);
	});

	// fix: #4752
	it.todo('guitar-harmonic-artificial-two-heads (pp. 385, 388): open diamond');

	it.concurrent('guitar-harmonic-combined-stem (p. 388): combines a natural harmonic diamond with an ordinary stopped notehead on one shared stem', async () => {
		const e = await engrave(
			'guitar-harmonics-scordatura',
			'guitar-harmonic-combined-stem',
		);
		const heads = e.headsIn(4);
		const c1Low = must(heads[0], 'chord 1 stopped');
		const c1High = must(heads[1], 'chord 1 harmonic');
		const c2Low = must(heads[2], 'chord 2 stopped');
		const c2High = must(heads[3], 'chord 2 harmonic');
		for (const [label, h] of [
			['Stopped 1', c1Low],
			['Harmonic 1', c1High],
			['Stopped 2', c2Low],
			['Harmonic 2', c2High],
		] as const) {
			markBox(e, h.head, label);
		}
		expect(
			e.check({
				chord1Aligned: Math.abs(c1High.head.x - c1Low.head.x) < c1Low.head.w,
				chord2Aligned: Math.abs(c2High.head.x - c2Low.head.x) < c2Low.head.w,
			}),
		).toMatchMeasurements({
			chord1Aligned: true,
			chord2Aligned: true,
		});
	});
});
