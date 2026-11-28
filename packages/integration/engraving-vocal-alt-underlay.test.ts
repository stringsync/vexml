import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { bottomEdge } from './engraving-spanners';

describe('Behind Bars alternative text underlay (pp. 449–451)', () => {
	it.concurrent('draws alternative vocal underlay, cue rhythms, rests, tuplets, and dotted ties/slurs', async () => {
		expect(await draw('vocal-alt-underlay')).toMatchScreenshot(
			'engraving_vocal-alt-underlay.png',
		);
	});

	it.concurrent('vocal-hyphen-across-rests (p. 449): places centred hyphens across short rests and before/after extended rests', async () => {
		const e = await engrave('vocal-alt-underlay', 'vocal-hyphen-across-rests');
		const m1 = e.inMeasure('lyric', 0).sort((a, b) => a.box.x - b.box.x);
		const m2 = e.inMeasure('lyric', 1).sort((a, b) => a.box.x - b.box.x);
		expect(m1.length).toBe(4);
		expect(m2.length).toBe(2);
		const wa = must(m1[0], 'wa syllable');
		const midHyphen = must(m1[1], 'hyphen between wa and ter');
		const ter = must(m1[2], 'ter syllable');
		const afterTer = must(m1[3], 'hyphen after ter');
		const beforeFall = must(m2[0], 'hyphen before fall');
		const fall = must(m2[1], 'fall syllable');
		markBox(e, midHyphen.box, 'Centred hyphen');
		markBox(e, afterTer.box, 'Hyphen before rest');
		markBox(e, beforeFall.box, 'Hyphen after rest');
		const space = e.space(0);
		const waRight = wa.box.x + wa.box.w;
		const terRight = ter.box.x + ter.box.w;
		const midCenter = midHyphen.box.x + midHyphen.box.w / 2;
		const gapMid = (waRight + ter.box.x) / 2;
		const centeredBetweenWaTer =
			midHyphen.box.x > waRight &&
			midHyphen.box.x + midHyphen.box.w < ter.box.x &&
			Math.abs(midCenter - gapMid) < space * 0.5;
		const afterTerClear = afterTer.box.x > terRight + 3;
		const beforeFallClear =
			beforeFall.box.x + beforeFall.box.w < fall.box.x - 3;
		const noRestChain = m1.length === 4 && m2.length === 2;
		expect(
			e.check([
				centeredBetweenWaTer,
				afterTerClear,
				beforeFallClear,
				noRestChain,
			]),
		).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('vocal-alt-rhythm-cue-stems (pp. 449–450): draws alternative rhythm cue-sized with opposing stems', async () => {
		const e = await engrave('vocal-alt-underlay', 'vocal-alt-rhythm-cue-stems');
		const v1 = e.headsIn(2, { voice: '1' });
		const v2 = e.headsIn(2, { voice: '2' });
		expect(v1.length).toBeGreaterThanOrEqual(4);
		expect(v2.length).toBeGreaterThanOrEqual(5);
		const mainHead = must(v1[0], 'v1 note').head;
		const cueHead = must(v2[1], 'v2 cue note').head;
		markBox(e, mainHead, 'Principal head');
		markBox(e, cueHead, 'Cue head');
		const cueSmaller = cueHead.w < mainHead.w * 0.9;
		const midY = e.middle(2);
		const stems = e.inMeasure('stem', 2);
		const upStems = stems.filter((s) => s.box.y < midY - e.space(2));
		const downStems = stems.filter(
			(s) => bottomEdge(s.box) > midY + e.space(2),
		);
		const opposingStems = upStems.length >= 4 && downStems.length >= 4;
		expect(e.check([cueSmaller, opposingStems])).toMatchMeasurements([
			true,
			true,
		]);
	});

	it.concurrent('vocal-alt-rhythm-tuplet-side (p. 450): places a single-voice alternative-rhythm tuplet on its stem side', async () => {
		const e = await engrave(
			'vocal-alt-underlay',
			'vocal-alt-rhythm-tuplet-side',
		);
		const bottom = must(e.lines(3).at(-1), 'bottom stave line');
		const tuplets = e.inMeasure('tuplet', 3);
		expect(tuplets.length).toBeGreaterThanOrEqual(1);
		const t = must(tuplets[0], 'tuplet');
		markBox(e, t.box, 'Voice 2 tuplet');
		const belowStave = t.box.y >= bottom;
		expect(e.check(belowStave)).toMatchMeasurements(true);
	});

	it.concurrent('vocal-alt-rhythm-cue-rest (p. 450): draws alternative-rhythm rests at cue size clear of notes', async () => {
		const e = await engrave('vocal-alt-underlay', 'vocal-alt-rhythm-cue-rest');
		const v1Rests = e.restsIn(4, { voice: '1' });
		const v2Rests = e.restsIn(4, { voice: '2' });
		expect(v1Rests.length).toBe(1);
		expect(v2Rests.length).toBe(2);
		const fullEighth = must(v1Rests[0], 'v1 full eighth rest').head;
		const cueEighth = must(v2Rests[0], 'v2 cue eighth rest').head;
		const cueQuarter = must(v2Rests[1], 'v2 cue quarter rest').head;
		markBox(e, fullEighth, 'Full eighth rest');
		markBox(e, cueEighth, 'Cue eighth rest');
		markBox(e, cueQuarter, 'Cue quarter rest');
		const cueEighthSmaller =
			cueEighth.w < fullEighth.w * 0.9 && cueEighth.h < fullEighth.h * 0.9;
		const cueQuarterSmaller = cueQuarter.h < 2.2 * e.space(4);
		const heads = e.headsIn(4);
		const clearOfNotes = [cueEighth, cueQuarter].every((r) =>
			heads.every(
				(n) =>
					r.x + r.w <= n.head.x ||
					n.head.x + n.head.w <= r.x ||
					r.y + r.h <= n.head.y ||
					n.head.y + n.head.h <= r.y,
			),
		);
		expect(
			e.check([cueEighthSmaller, cueQuarterSmaller, clearOfNotes]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('vocal-dotted-tie-slur (p. 451): draws dotted ties and dotted slurs with shorter slur nested inside', async () => {
		const e = await engrave('vocal-alt-underlay', 'vocal-dotted-tie-slur');
		const slurs = e.inMeasure('slur', 5);
		expect(slurs.length).toBeGreaterThanOrEqual(2);
		const sorted = [...slurs].sort((a, b) => a.box.w - b.box.w);
		const inner = must(sorted[0], 'shorter solid slur');
		const outer = must(sorted[sorted.length - 1], 'longer dotted slur');
		markBox(e, inner.box, 'Shorter solid slur');
		markBox(e, outer.box, 'Longer dotted slur');
		const topLine = must(e.lines(5)[0], 'top stave line');
		const bothAbove = inner.box.y < topLine && outer.box.y < topLine;
		const nestedCloser = bothAbove
			? inner.box.y > outer.box.y
			: bottomEdge(inner.box) < bottomEdge(outer.box);
		expect(e.check(nestedCloser)).toMatchMeasurements(true);
	});
});
