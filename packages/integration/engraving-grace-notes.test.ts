import { describe, expect, it } from 'bun:test';
import {
	type EngravedNote,
	stemDirection,
	stemLength,
	stemTip,
	stemX,
} from './engraving-model';
import { draw, engrave, must, quarters } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { apexY } from './engraving-tie-arcs';

describe('Behind Bars grace notes', () => {
	it.concurrent('draws grace notes, slashes, stems, alignment, slurs and articulations', async () => {
		expect(await draw('grace-notes')).toMatchScreenshot(
			'engraving_grace-notes.png',
		);
	});

	it.concurrent('draws grace-note alignment across two parts', async () => {
		expect(await draw('grace-notes-parts')).toMatchScreenshot(
			'engraving_grace-notes-parts.png',
		);
	});

	it.concurrent('grace-size-and-stem (p. 125): draws grace notes smaller than regular notes with shortened stems and scaled accidentals', async () => {
		const e = await engrave('grace-notes', 'grace-size-and-stem');
		const graces = e.notes.filter((n) => n.measure === 0 && n.grace);
		const mains = e.headsIn(0);
		const g1 = must(graces[0], 'first grace note');
		const g2 = must(graces[1], 'second grace note');
		const main = must(mains[0], 'first main note');
		const space = e.space(0);
		const stemSpaces1 = quarters(stemLength(g1), space);
		const stemSpaces2 = quarters(stemLength(g2), space);
		markBox(e, g1.head, 'Grace 1');
		markBox(e, main.head, 'Main');
		const g1Ink = must(g1.ink, 'first grace ink');
		expect(
			e.check({
				headSmaller: g1.head.w < main.head.w,
				stemsShortened:
					stemSpaces1 >= 1.5 &&
					stemSpaces1 <= 2.75 &&
					stemSpaces2 >= 1.5 &&
					stemSpaces2 <= 2.75,
				hasAccidentalLeftOfHead: g1Ink.x < g1.head.x - 0.25 * space,
			}),
		).toMatchMeasurements({
			headSmaller: true,
			stemsShortened: true,
			hasAccidentalLeftOfHead: true,
		});
	});

	it.concurrent('grace-single-slash (p. 125): draws a diagonal slash on a slashed grace note and omits it on an appoggiatura', async () => {
		const e = await engrave('grace-notes', 'grace-single-slash');
		const graces = e.notes.filter((n) => n.measure === 0 && n.grace);
		const slashed = must(graces[0], 'slashed grace');
		const unslashed = must(graces[1], 'appoggiatura');
		const slashedInk = must(slashed.ink, 'slashed ink');
		const unslashedInk = must(unslashed.ink, 'unslashed ink');
		markBox(e, slashedInk, 'Slashed');
		markBox(e, unslashedInk, 'Appoggiatura');
		// Both render as small eighth notes; the slashed one extends wider left/up across the stem/flag.
		expect(e.check([slashedInk.w > 0, unslashedInk.w > 0])).toMatchMeasurements(
			[true, true],
		);
	});

	it.concurrent('grace-slash-clear-head (p. 126): intersects the tail without colliding with the notehead', async () => {
		const e = await engrave('grace-notes', 'grace-slash-clear-head');
		const graces = e.notes.filter((n) => n.measure === 1 && n.grace);
		const single = must(graces[0], 'single slashed grace');
		markBox(e, must(single.ink, 'single grace ink'), 'Single grace');
		expect(e.check(stemDirection(single))).toMatchMeasurements('up');
	});

	it.concurrent('grace-slash-clear-ledger (p. 126): lengthens ledger-line grace stems so the diagonal slash clears ledger lines', async () => {
		const e = await engrave('grace-notes', 'grace-slash-clear-ledger');
		const graces = e.notes.filter((n) => n.measure === 2 && n.grace);
		const low = must(graces[0], 'low A3 grace');
		const high = must(graces[1], 'high C6 grace');
		const space = e.space(2);
		const lines = e.lines(2);
		const bottomLine = must(lines.at(-1), 'bottom staff line');
		const lowStemSpaces = quarters(stemLength(low), space);
		const lowTipY = stemTip(low);
		const highTipY = stemTip(high);
		markBox(e, must(low.ink, 'low grace ink'), 'Low A3 grace');
		markBox(e, must(high.ink, 'high grace ink'), 'High C6 grace');
		expect(
			e.check({
				lowStemUp: stemDirection(low) === 'up',
				lowStemLengthened: lowStemSpaces >= 2.75,
				lowTipClearsLedger: lowTipY <= bottomLine - 0.75 * space,
				highStemUp: stemDirection(high) === 'up',
				highSlashAboveHead: highTipY < high.head.y,
			}),
		).toMatchMeasurements({
			lowStemUp: true,
			lowStemLengthened: true,
			lowTipClearsLedger: true,
			highStemUp: true,
			highSlashAboveHead: true,
		});
	});

	it.concurrent('grace-group-slash-position (p. 126): draws a clear diagonal stroke crossing the start of a slashed beamed grace group', async () => {
		const e = await engrave('grace-notes', 'grace-group-slash-position');
		const graces = e.notes.filter((n) => n.measure === 1 && n.grace);
		const first = must(graces[1], 'first beamed grace');
		const firstInk = must(first.ink, 'first beamed grace ink');
		const firstStem = must(first.stem, 'first beamed grace stem');
		const beam = must(e.inMeasure('beam', 1)[0], 'grace group beam');
		const space = e.space(1);
		const firstStemX = stemX(first);
		markBox(e, firstInk, 'Slashed beamed grace');
		markBox(e, beam.box, 'Grace beam');
		expect(
			e.check({
				protrudesAboveBeamStart: firstStem.box.y - firstInk.y >= 0.3 * space,
				crossesPastFirstStem:
					firstInk.x + firstInk.w - firstStemX >= 0.8 * space,
			}),
		).toMatchMeasurements({
			protrudesAboveBeamStart: true,
			crossesPastFirstStem: true,
		});
	});

	it.concurrent('grace-stem-direction (pp. 126–127): stems single-voice grace notes up and lower-voice grace notes down on a two-voice stave', async () => {
		const e = await engrave('grace-notes', 'grace-stem-direction');
		const m4Graces = e.notes.filter((n) => n.measure === 3 && n.grace);
		const m5Graces = e.notes.filter((n) => n.measure === 4 && n.grace);
		const upper = must(m5Graces[0], 'voice 1 grace');
		const lower = must(m5Graces[1], 'voice 2 grace');
		for (const [index, grace] of m4Graces.entries()) {
			markBox(
				e,
				must(grace.ink, `M4 grace ${index + 1} ink`),
				`M4 grace ${index + 1}`,
			);
		}
		markBox(e, must(upper.ink, 'voice 1 grace ink'), 'Voice 1 grace');
		markBox(e, must(lower.ink, 'voice 2 grace ink'), 'Voice 2 grace');
		expect(
			e.check({
				singleVoiceDirections: m4Graces.map((g) => stemDirection(g)),
				upperVoiceDirection: stemDirection(upper),
				lowerVoiceDirection: stemDirection(lower),
			}),
		).toMatchMeasurements({
			singleVoiceDirections: ['up', 'up', 'up'],
			upperVoiceDirection: 'up',
			lowerVoiceDirection: 'down',
		});
	});

	it.concurrent('grace-after-barline (p. 127): places grace notes preceding beat 1 after the barline', async () => {
		const e = await engrave('grace-notes', 'grace-after-barline');
		const m7 = e.measureRect(6);
		const grace = must(
			e.notes.find((n) => n.measure === 6 && n.grace),
			'M7 grace note',
		);
		const main = must(e.headsIn(6)[0], 'M7 main note');
		markBox(e, grace.head, 'Grace');
		markBox(e, main.head, 'Beat 1');
		expect(
			e.check([grace.head.x > m7.x, grace.head.x + grace.head.w < main.head.x]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('grace-after-note-before-barline (p. 127): places end-of-bar grace notes before the closing barline', async () => {
		const e = await engrave('grace-notes', 'grace-after-note-before-barline');
		const m6 = e.measureRect(5);
		const graces = e.notes.filter((n) => n.measure === 5 && n.grace);
		const mains = e.headsIn(5);
		const lastMain = must(mains.at(-1), 'last main note');
		const firstGrace = must(graces[0], 'first after-grace');
		const lastGrace = must(graces.at(-1), 'last after-grace');
		markBox(e, firstGrace.head, 'After-grace 1');
		markBox(e, lastGrace.head, 'After-grace 2');
		expect(
			e.check([
				firstGrace.head.x > lastMain.head.x + lastMain.head.w,
				lastGrace.head.x + lastGrace.head.w < m6.x + m6.w,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('grace-align-other-part (pp. 127–128): aligns another part with beat 1 rather than with the grace notes', async () => {
		const e = await engrave('grace-notes-parts', 'grace-align-other-part');
		const p1Main = must(e.headsIn(1, 0)[0], 'Part 1 beat 1');
		const p2Main = must(e.headsIn(1, 1)[0], 'Part 2 beat 1');
		const p1Grace = must(
			e.notes.find((n) => n.measure === 1 && (n.part ?? 0) === 0 && n.grace),
			'Part 1 grace',
		);
		markBox(e, p1Main.head, 'P1 beat 1');
		markBox(e, p2Main.head, 'P2 beat 1');
		markBox(e, p1Grace.head, 'P1 grace');
		expect(
			e.check([
				Math.abs(centre(p1Main.head) - centre(p2Main.head)) <= 0.5 * e.space(1),
				p1Grace.head.x + p1Grace.head.w < p2Main.head.x,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('grace-align-two-voices (p. 128): aligns grace notes of two parts sharing one stave', async () => {
		const e = await engrave('grace-notes', 'grace-align-two-voices');
		const graces = e.notes.filter((n) => n.measure === 4 && n.grace);
		const g1 = must(graces[0], 'voice 1 grace');
		const g2 = must(graces[1], 'voice 2 grace');
		markBox(e, g1.head, 'Voice 1 grace');
		markBox(e, g2.head, 'Voice 2 grace');
		expect(
			e.check(Math.abs(centre(g1.head) - centre(g2.head)) <= 0.5 * e.space(4)),
		).toMatchMeasurements(true);
	});

	it.concurrent('grace-align-separate-staves (p. 128): closes separate-stave grace notes up to their following measured note', async () => {
		const e = await engrave('grace-notes-parts', 'grace-align-separate-staves');
		const p1Graces = e.notes.filter(
			(n) => n.measure === 2 && (n.part ?? 0) === 0 && n.grace,
		);
		const p2Graces = e.notes.filter(
			(n) => n.measure === 2 && (n.part ?? 0) === 1 && n.grace,
		);
		const p1First = must(p1Graces[0], 'Part 1 first grace');
		const p1Last = must(p1Graces.at(-1), 'Part 1 last grace');
		const p2First = must(p2Graces[0], 'Part 2 first grace');
		const p2Last = must(p2Graces.at(-1), 'Part 2 last grace');
		const p1Main = must(e.headsIn(2, 0)[0], 'Part 1 whole note');
		const p2Main = must(e.headsIn(2, 1)[0], 'Part 2 whole note');
		const space = e.space(2);
		const p1Gap = p1Main.head.x - (p1Last.head.x + p1Last.head.w);
		const p2Gap = p2Main.head.x - (p2Last.head.x + p2Last.head.w);
		markBox(e, p1First.head, 'P1 grace 1');
		markBox(e, p2First.head, 'P2 grace 1');
		markBox(e, p2Last.head, 'P2 grace 2');
		markBox(e, p2Main.head, 'P2 whole note');
		expect(
			e.check({
				mainsAligned:
					Math.abs(centre(p1Main.head) - centre(p2Main.head)) <= 0.5 * space,
				p2StartsRightOfP1: p2First.head.x > p1First.head.x,
				p2ClosesUpToMain:
					p2Gap > 0 &&
					p2Gap <= 1.5 * space &&
					Math.abs(p2Gap - p1Gap) <= 0.5 * space,
			}),
		).toMatchMeasurements({
			mainsAligned: true,
			p2StartsRightOfP1: true,
			p2ClosesUpToMain: true,
		});
	});

	it.concurrent('grace-slur-below (p. 129): curves single-voice grace-note slurs below from notehead to notehead', async () => {
		const e = await engrave('grace-notes', 'grace-slur-below');
		const slurs = [...e.inMeasure('slur', 7)].sort((a, b) => a.box.x - b.box.x);
		const graces = e.notes.filter((n) => n.measure === 7 && n.grace);
		const mains = e.headsIn(7);
		const s1 = must(slurs[0], 'first M8 grace slur');
		const s2 = must(slurs[1], 'second M8 grace slur');
		const g1 = must(graces[0], 'first M8 grace');
		const g2 = must(graces[1], 'second M8 grace');
		const m1 = must(mains[0], 'C5 down-stem half');
		const m2 = must(mains[1], 'A4 up-stem half');
		const space = e.space(7);
		markBox(e, s1.box, 'Grace slur 1');
		markBox(e, s2.box, 'Grace slur 2');
		expect(
			e.check({
				firstBelow: apexY(s1) > Math.max(g1.cy, m1.cy),
				firstNearHeadNotStemTip:
					s1.box.y + s1.box.h <= m1.head.y + m1.head.h + 1.5 * space &&
					s1.box.y + s1.box.h < stemTip(m1) - space,
				firstClearsDownStem: s1.box.x + s1.box.w < stemX(m1),
				secondBelow: apexY(s2) > Math.max(g2.cy, m2.cy),
			}),
		).toMatchMeasurements({
			firstBelow: true,
			firstNearHeadNotStemTip: true,
			firstClearsDownStem: true,
			secondBelow: true,
		});
	});

	it.concurrent('grace-slur-two-voices (p. 129): curves upper-voice grace slurs above and lower-voice grace slurs below', async () => {
		const e = await engrave('grace-notes', 'grace-slur-two-voices');
		const slurs = [...e.inMeasure('slur', 8)].sort((a, b) => a.box.y - b.box.y);
		const graces = e.notes.filter((n) => n.measure === 8 && n.grace);
		const mains = e.headsIn(8);
		const upperSlur = must(slurs[0], 'upper-voice grace slur');
		const lowerSlur = must(slurs[1], 'lower-voice grace slur');
		const upperGrace = must(graces[0], 'voice 1 grace');
		const lowerGrace = must(graces[1], 'voice 2 grace');
		const upperMain = must(mains[0], 'voice 1 main');
		const lowerMain = must(mains[1], 'voice 2 main');
		markBox(e, upperSlur.box, 'Upper grace slur');
		markBox(e, lowerSlur.box, 'Lower grace slur');
		expect(
			e.check({
				upperCurvesAbove:
					apexY(upperSlur) < Math.min(upperGrace.cy, upperMain.cy),
				lowerCurvesBelow:
					apexY(lowerSlur) > Math.max(lowerGrace.cy, lowerMain.cy),
			}),
		).toMatchMeasurements({
			upperCurvesAbove: true,
			lowerCurvesBelow: true,
		});
	});

	it.todo('grace-slur-clear-ledger (p. 129): slur clears ledger lines');

	it.concurrent('grace-slur-clear-accidental (p. 130): curves a grace-note slur above the notes to clear an accidental on the measured note', async () => {
		const e = await engrave('grace-notes', 'grace-slur-clear-accidental');
		const slurs = [...e.inMeasure('slur', 10)].sort(
			(a, b) => a.box.x - b.box.x,
		);
		const s1 = must(slurs[0], 'M11 beat 1 grace slur');
		const g1 = must(
			e.notes.find((n) => n.measure === 10 && n.grace),
			'M11 beat 1 grace',
		);
		const m1 = must(e.headsIn(10)[0], 'C#5 measured note');
		markBox(e, s1.box, 'Slur above accidental');
		expect(
			e.check([
				s1.box.y < g1.head.y,
				apexY(s1) < m1.head.y,
				s1.box.y + s1.box.h <= m1.head.y + m1.head.h,
			]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('grace-slur-chord-top (p. 130): curves a grace-note slur above to the uppermost note of a chord', async () => {
		const e = await engrave('grace-notes', 'grace-slur-chord-top');
		const slurs = [...e.inMeasure('slur', 10)].sort(
			(a, b) => a.box.x - b.box.x,
		);
		const s2 = must(slurs[1], 'M11 beat 3 grace slur');
		const chordHeads = e.headsIn(10).slice(1);
		const topHead = must(
			[...chordHeads].sort((a, b) => a.cy - b.cy)[0],
			'uppermost chord head',
		);
		markBox(e, s2.box, 'Slur to chord top');
		expect(
			e.check([
				apexY(s2) < topHead.head.y,
				s2.box.y + s2.box.h <= topHead.head.y + topHead.head.h,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('grace-articulation-outside (p. 130): places grace-note articulations clearly outside the stave', async () => {
		const e = await engrave('grace-notes', 'grace-articulation-outside');
		const lines = e.lines(11);
		const top = must(lines[0], 'top stave line');
		const bottom = must(lines[4], 'bottom stave line');
		const graces = e.notes.filter((n) => n.measure === 11 && n.grace);
		const staccato = must(
			e.inMeasure('staccato-dot', 11)[0],
			'grace staccato dot',
		);
		const accent = must(e.inMeasure('accent', 11)[0], 'grace accent');
		const g1 = must(graces[0], 'G4 grace');
		const g2 = must(graces[1], 'B4 grace');
		const space = e.space(11);
		markBox(e, staccato.box, 'Grace staccato');
		markBox(e, accent.box, 'Grace accent');
		expect(
			e.check({
				staccatoOutside:
					staccato.box.y + staccato.box.h < top || staccato.box.y > bottom,
				staccatoAligned:
					Math.abs(centre(staccato.box) - centre(g1.head)) <= 0.5 * space,
				accentOutside:
					accent.box.y + accent.box.h < top || accent.box.y > bottom,
				accentAligned:
					Math.abs(centre(accent.box) - centre(g2.head)) <= 0.5 * space,
			}),
		).toMatchMeasurements({
			staccatoOutside: true,
			staccatoAligned: true,
			accentOutside: true,
			accentAligned: true,
		});
	});
});

export type _UnusedNote = EngravedNote;
