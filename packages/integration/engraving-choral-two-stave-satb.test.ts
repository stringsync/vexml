import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';
import { bottomEdge } from './engraving-spanners';

describe('Behind Bars two-stave SATB layout and omitted notes (pp. 468–469)', () => {
	it.concurrent('draws two-stave SATB layout with separate stems, centred lyrics, stem-end slurs and articulations, and bracketed omitted notes', async () => {
		expect(await draw('choral-two-stave-satb')).toMatchScreenshot(
			'engraving_choral-two-stave-satb.png',
		);
	});

	it.concurrent('choral-satb-two-stave-stems (p. 468): stems soprano and tenor up and alto and bass down throughout', async () => {
		const e = await engrave(
			'choral-two-stave-satb',
			'choral-satb-two-stave-stems',
		);
		const soprano = e.headsIn(0, { part: 0, voice: '1' });
		const alto = e.headsIn(0, { part: 0, voice: '2' });
		const tenor = e.headsIn(0, { part: 1, voice: '1' });
		const bass = e.headsIn(0, { part: 1, voice: '2' });
		const upOk = [...soprano, ...tenor].every((n) => {
			const stem = must(n.stem, 'upward stem');
			markBox(e, stem.box, 'Up stem');
			return stem.box.y < n.head.y;
		});
		const downOk = [...alto, ...bass].every((n) => {
			const stem = must(n.stem, 'downward stem');
			markBox(e, stem.box, 'Down stem');
			return bottomEdge(stem.box) > bottomEdge(n.head);
		});
		const ok =
			soprano.length === 3 &&
			alto.length === 3 &&
			tenor.length === 3 &&
			bass.length === 3 &&
			upOk &&
			downOk;
		expect(e.check(ok)).toMatchMeasurements(true);
	});

	it.concurrent('choral-satb-two-stave-centred-lyrics (p. 468): places deviating bass lyrics below bass dynamics', async () => {
		const e = await engrave(
			'choral-two-stave-satb',
			'choral-satb-two-stave-centred-lyrics',
		);
		const upperTop = must(e.lines(0, 0, 1)[0], 'upper stave top');
		const upperBottom = must(e.lines(0, 0, 1).at(-1), 'upper stave bottom');
		const lowerTop = must(e.lines(0, 1, 1)[0], 'lower stave top');
		const lowerBottom = must(e.lines(0, 1, 1).at(-1), 'lower stave bottom');
		const m0 = e.measureRect(0);
		const inM0 = (ink: { box: { x: number } }) =>
			ink.box.x >= m0.x && ink.box.x < m0.x + m0.w;
		const upperDyn = e.inks.find(
			(ink) =>
				ink.kind === 'words' && inM0(ink) && bottomEdge(ink.box) < upperTop,
		);
		const bassDyn = e.inks.find(
			(ink) => ink.kind === 'words' && inM0(ink) && ink.box.y > lowerBottom,
		);
		if (upperDyn) {
			markBox(e, upperDyn.box, 'Upper dynamic');
		}
		if (bassDyn) {
			markBox(e, bassDyn.box, 'Bass dynamic');
		}
		const sharedLyrics = e.inks.filter(
			(ink) =>
				ink.kind === 'lyric' &&
				inM0(ink) &&
				ink.box.y > upperBottom &&
				bottomEdge(ink.box) < lowerTop,
		);
		for (const l of sharedLyrics) {
			markBox(e, l.box, 'Shared lyric');
		}
		const bassLyrics = e.inks.filter(
			(ink) => ink.kind === 'lyric' && inM0(ink) && ink.box.y > lowerBottom,
		);
		for (const l of bassLyrics) {
			markBox(e, l.box, 'Bass lyric');
		}
		const bassTops = bassLyrics.map((l) => l.box.y);
		const bassAligned =
			bassLyrics.length === 3 &&
			Math.max(...bassTops) - Math.min(...bassTops) < 3;
		const bassLyricsBelowDyn =
			bassDyn !== undefined &&
			bassAligned &&
			bassLyrics.every((l) => l.box.y > bottomEdge(bassDyn.box));
		const sharedBetweenStaves = sharedLyrics.length === 2;
		const ok =
			upperDyn !== undefined &&
			bassDyn !== undefined &&
			sharedBetweenStaves &&
			bassLyricsBelowDyn;
		expect(e.check(ok)).toMatchMeasurements(true);
	});

	it.concurrent('choral-satb-two-stave-slurs-artic (p. 468): places articulations and syllabic slurs at stem ends of all four voices', async () => {
		const e = await engrave(
			'choral-two-stave-satb',
			'choral-satb-two-stave-slurs-artic',
		);
		const upperTop = must(e.lines(0, 0, 1)[0], 'upper stave top');
		const upperBottom = must(e.lines(0, 0, 1).at(-1), 'upper stave bottom');
		const lowerTop = must(e.lines(0, 1, 1)[0], 'lower stave top');
		const lowerBottom = must(e.lines(0, 1, 1).at(-1), 'lower stave bottom');
		const m0 = e.measureRect(0);
		const slurs = e.inks.filter(
			(ink) =>
				ink.kind === 'slur' && ink.box.x >= m0.x && ink.box.x < m0.x + m0.w,
		);
		for (const s of slurs) {
			markBox(e, s.box, 'Syllabic slur');
		}
		const sopranoSlurAbove = slurs.some((s) => bottomEdge(s.box) < upperTop);
		const altoSlurBelow = slurs.some(
			(s) => s.box.y > upperBottom && bottomEdge(s.box) < lowerTop,
		);
		const tenorSlurAbove = slurs.some(
			(s) =>
				s.box.y > upperBottom &&
				bottomEdge(s.box) < lowerTop &&
				s.box.y > (upperBottom + lowerTop) / 2,
		);
		// Bass beat 1 has a downward tenuto below the lower stave.
		const bassHead = must(
			e.headsIn(0, { part: 1, voice: '2' })[0],
			'bass beat 1',
		);
		const bassCx = bassHead.head.x + bassHead.head.w / 2;
		const bassTenuto = e.inks.find(
			(ink) =>
				ink.box.h < 8 &&
				ink.box.w >= 6 &&
				ink.box.w <= 20 &&
				Math.abs(ink.box.x + ink.box.w / 2 - bassCx) < 8 &&
				ink.box.y > lowerBottom &&
				ink.box.y < lowerBottom + 20,
		);
		if (bassTenuto) {
			markBox(e, bassTenuto.box, 'Bass tenuto below');
		}
		const ok =
			sopranoSlurAbove &&
			altoSlurBelow &&
			tenorSlurAbove &&
			bassTenuto !== undefined;
		expect(e.check(ok)).toMatchMeasurements(true);
	});

	it.concurrent('choral-omitted-note-brackets (p. 469): encloses omitted full-sized and added cue-sized notes in round parentheses', async () => {
		const e = await engrave(
			'choral-two-stave-satb',
			'choral-omitted-note-brackets',
		);
		const soprano = e.headsIn(1, { part: 0, voice: '1' });
		expect(soprano).toHaveLength(4);
		const [b1, b2, b3] = soprano;
		const n1 = must(b1, 'beat 1 bracketed full note');
		const n2 = must(b2, 'beat 2 plain full note');
		const n3 = must(b3, 'beat 3 bracketed cue note');
		markBox(e, n1.head, 'Bracketed full head');
		markBox(e, n3.head, 'Bracketed cue head');
		const inkSpanAt = (head: {
			x: number;
			y: number;
			w: number;
			h: number;
		}) => {
			const cy = head.y + head.h / 2;
			const hits = e.inks.filter(
				(ink) =>
					ink.kind !== 'stave' &&
					ink.kind !== 'stavenote' &&
					ink.kind !== 'words' &&
					ink.kind !== 'stem' &&
					ink.box.w < 40 &&
					ink.box.y <= cy &&
					bottomEdge(ink.box) >= cy &&
					ink.box.x <= head.x + head.w + 8 &&
					ink.box.x + ink.box.w >= head.x - 8,
			);
			const left = Math.min(...hits.map((i) => i.box.x));
			const right = Math.max(...hits.map((i) => i.box.x + i.box.w));
			return right - left;
		};
		const b1HasParens = inkSpanAt(n1.head) > n1.head.w + 4;
		const b3HasParens = inkSpanAt(n3.head) > n3.head.w + 4;
		const b3CueSized = n3.head.w < n2.head.w;
		expect(e.check([b1HasParens, b3HasParens, b3CueSized])).toMatchMeasurements(
			[true, true, true],
		);
	});
});
