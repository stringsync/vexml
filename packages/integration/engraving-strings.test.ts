import { describe, expect, it } from 'bun:test';
import type { Box, Ink } from './engraving-ink';
import type { Engraving } from './engraving-model';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge, onStave } from './engraving-spanners';

describe('Behind Bars strings playing techniques (pp. 391–406)', () => {
	it.concurrent('draws string designations, open strings, fingering, thumb position, multiple stops and bowing marks', async () => {
		expect(await draw('strings-techniques')).toMatchScreenshot(
			'engraving_strings-techniques.png',
		);
	});

	it.concurrent('draws a two-stave single string part with a curly brace', async () => {
		expect(await draw('strings-two-staves')).toMatchScreenshot(
			'engraving_strings-two-staves.png',
		);
	});

	it.concurrent('string-designation-placement (p. 394): places single-voice string designations above the stave and lower-voice designations below in two-voice writing', async () => {
		const e = await engrave(
			'strings-techniques',
			'string-designation-placement',
		);
		const top0 = must(e.lines(0)[0], 'measure 1 top stave line');
		const m1 = marks(e, 'string-number', 0);
		expect(m1).toHaveLength(4);
		const singleAbove = m1.map((mark, i) => {
			markBox(e, mark.box, `M1 String ${i + 1}`);
			return bottomEdge(mark.box) < top0;
		});

		const top1 = must(e.lines(1)[0], 'measure 2 top stave line');
		const bot1 = must(e.lines(1)[4], 'measure 2 bottom stave line');
		const m2 = marks(e, 'string-number', 1);
		expect(m2).toHaveLength(4);
		const midX = (must(m2[0], 'first').box.x + must(m2[3], 'last').box.x) / 2;
		const beat1 = m2
			.filter((m) => centre(m.box) < midX)
			.sort((a, b) => a.box.y - b.box.y);
		const beat3 = m2
			.filter((m) => centre(m.box) >= midX)
			.sort((a, b) => a.box.y - b.box.y);
		expect(beat1).toHaveLength(2);
		expect(beat3).toHaveLength(2);
		const pairOk = (pair: Ink[], label: string) => {
			const upper = must(pair[0], `${label} upper`);
			const lower = must(pair[1], `${label} lower`);
			markBox(e, upper.box, `${label} V1`);
			markBox(e, lower.box, `${label} V2`);
			return bottomEdge(upper.box) < top1 && lower.box.y > bot1;
		};
		expect(
			e.check([...singleAbove, pairOk(beat1, 'M2 B1'), pairOk(beat3, 'M2 B3')]),
		).toMatchMeasurements([true, true, true, true, true, true]);
	});

	it.concurrent('string-open-above (p. 395): places open-string zeros above the stave in single-voice writing regardless of stem direction', async () => {
		const e = await engrave('strings-techniques', 'string-open-above');
		const top = must(e.lines(2)[0], 'top stave line');
		const opens = marks(e, 'harmonic-circle', 2);
		expect(opens).toHaveLength(4);
		const above = opens.map((mark, i) => {
			markBox(e, mark.box, `Open ${i + 1}`);
			return bottomEdge(mark.box) < top;
		});
		expect(e.check(above)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('string-open-lower-voice (p. 395): places voice 1 open-string zero above the stave and voice 2 below in two-voice writing', async () => {
		const e = await engrave('strings-techniques', 'string-open-lower-voice');
		const top = must(e.lines(3)[0], 'measure 4 top stave line');
		const bot = must(e.lines(3)[4], 'measure 4 bottom stave line');
		const opens = marks(e, 'harmonic-circle', 3).sort(
			(a, b) => a.box.y - b.box.y,
		);
		expect(opens).toHaveLength(2);
		const upper = must(opens[0], 'voice 1 open-string');
		const lower = must(opens[1], 'voice 2 open-string');
		markBox(e, upper.box, 'V1 Open');
		markBox(e, lower.box, 'V2 Open');
		expect(
			e.check([bottomEdge(upper.box) < top, lower.box.y > bot]),
		).toMatchMeasurements([true, true]);
	});

	// string-open-middle-chord (p. 395): approved as drawn (circle above whole chord, matching MuseScore and Verovio).

	it.concurrent('string-fingering-stack-order (p. 396): places single-voice fingerings above the stave, above articulation marks and below bowing signs and string indications', async () => {
		const e = await engrave(
			'strings-techniques',
			'string-fingering-stack-order',
		);
		const top5 = must(e.lines(5)[0], 'measure 6 top stave line');
		const m6Fingerings = marks(e, 'notehead', 5)
			.map((mark) => aboveStaveBox(mark, top5))
			.filter((box): box is NonNullable<typeof box> => box !== null);
		expect(m6Fingerings).toHaveLength(4);
		const m6Above = m6Fingerings.map((box, i) => {
			markBox(e, box, `M6 Fing ${i + 1}`);
			return bottomEdge(box) < top5;
		});

		const top6 = must(e.lines(6)[0], 'measure 7 top stave line');
		const m7Fingerings = marks(e, 'notehead', 6)
			.map((mark) => aboveStaveBox(mark, top6))
			.filter((box): box is NonNullable<typeof box> => box !== null);
		expect(m7Fingerings).toHaveLength(4);
		const downBow = must(marks(e, 'down-bow', 6)[0], 'M7 beat 1 down-bow');
		const accent = must(marks(e, 'accent', 6)[0], 'M7 beat 2 accent');
		const upBow = must(marks(e, 'up-bow', 6)[0], 'M7 beat 2 up-bow');
		const strings = marks(e, 'string-number', 6);
		expect(strings).toHaveLength(2);
		const f1 = must(m7Fingerings[0], 'M7 beat 1 fingering');
		const f2 = must(m7Fingerings[1], 'M7 beat 2 fingering');
		const f3 = must(m7Fingerings[2], 'M7 beat 3 fingering');
		const f4 = must(m7Fingerings[3], 'M7 beat 4 fingering');
		const s3 = must(strings[0], 'M7 beat 3 string');
		const s4 = must(strings[1], 'M7 beat 4 string');

		markBox(e, f1, 'M7 B1 Fing');
		markBox(e, downBow.box, 'M7 B1 Bow');
		markBox(e, accent.box, 'M7 B2 Accent');
		markBox(e, f2, 'M7 B2 Fing');
		markBox(e, upBow.box, 'M7 B2 Bow');
		markBox(e, f3, 'M7 B3 Fing');
		markBox(e, s3.box, 'M7 B3 String');
		markBox(e, f4, 'M7 B4 Fing');
		markBox(e, s4.box, 'M7 B4 String');

		const beat1Ok = bottomEdge(f1) < top6 && bottomEdge(downBow.box) < f1.y;
		const beat2Ok =
			bottomEdge(accent.box) < top6 &&
			bottomEdge(f2) < accent.box.y &&
			bottomEdge(upBow.box) < f2.y;
		const beat3Ok = bottomEdge(f3) < top6 && bottomEdge(s3.box) < f3.y;
		const beat4Ok = bottomEdge(f4) < top6 && bottomEdge(s4.box) < f4.y;

		expect(
			e.check([...m6Above, beat1Ok, beat2Ok, beat3Ok, beat4Ok]),
		).toMatchMeasurements([true, true, true, true, true, true, true, true]);
	});

	it.concurrent('string-thumb-position-symbol (p. 396): draws thumb-position marks above the stave as a circle with a downward stem', async () => {
		const e = await engrave(
			'strings-techniques',
			'string-thumb-position-symbol',
		);
		const top = must(e.lines(7)[0], 'top stave line');
		const thumbs = marks(e, 'thumb-position', 7);
		expect(thumbs).toHaveLength(4);
		const checks = thumbs.map((mark, i) => {
			markBox(e, mark.box, `Thumb ${i + 1}`);
			const above = bottomEdge(mark.box) < top;
			const midY = mark.box.y + mark.box.h / 2;
			const topRows = mark.rowYs().filter((y) => y < midY);
			const botRows = mark.rowYs().filter((y) => y >= midY);
			const span = (rows: number[]) =>
				Math.max(
					0,
					...rows.map((y) => {
						const segs = mark.segmentsAt(y);
						const first = segs[0];
						const last = segs[segs.length - 1];
						return first && last ? last[1] - first[0] : 0;
					}),
				);
			// Circle sits in the upper half and narrows into a downward vertical stem in the lower half.
			const downwardStem =
				mark.box.h > mark.box.w && span(topRows) > span(botRows);
			return above && downwardStem;
		});
		expect(e.check(checks)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('string-double-stop-both-open (pp. 397, 399): stacks open-string zeros vertically above the stave on chords with multiple open strings', async () => {
		const e = await engrave(
			'strings-techniques',
			'string-double-stop-both-open',
		);
		const top = must(e.lines(8)[0], 'top stave line');
		const opens = marks(e, 'harmonic-circle', 8);
		expect(opens).toHaveLength(5);
		const midX =
			(must(opens[0], 'first').box.x + must(opens[4], 'last').box.x) / 2;
		const doubleStop = opens
			.filter((m) => centre(m.box) < midX)
			.sort((a, b) => a.box.y - b.box.y);
		const tripleStop = opens
			.filter((m) => centre(m.box) >= midX)
			.sort((a, b) => a.box.y - b.box.y);
		expect(doubleStop).toHaveLength(2);
		expect(tripleStop).toHaveLength(3);
		const stacked = (col: Ink[], prefix: string) =>
			col.every((mark, i) => {
				markBox(e, mark.box, `${prefix} ${i + 1}`);
				const prev = col[i - 1];
				return (
					bottomEdge(mark.box) < top &&
					(prev === undefined || mark.box.y > bottomEdge(prev.box))
				);
			});
		expect(
			e.check([stacked(doubleStop, 'Double'), stacked(tripleStop, 'Triple')]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('string-double-stop-one-open (p. 397): places open-string zeros above for upper open strings and below for lower open strings on single- and double-stemmed double-stops', async () => {
		const e = await engrave(
			'strings-techniques',
			'string-double-stop-one-open',
		);
		const top9 = must(e.lines(9)[0], 'measure 10 top stave line');
		const bot9 = must(e.lines(9)[4], 'measure 10 bottom stave line');
		const m10 = marks(e, 'harmonic-circle', 9);
		expect(m10).toHaveLength(2);
		const m10Upper = must(m10[0], 'M10 beat 1 upper open-string');
		const m10Lower = must(m10[1], 'M10 beat 3 lower open-string');
		markBox(e, m10Upper.box, 'M10 B1 Upper');
		markBox(e, m10Lower.box, 'M10 B3 Lower');

		const top10 = must(e.lines(10)[0], 'measure 11 top stave line');
		const bot10 = must(e.lines(10)[4], 'measure 11 bottom stave line');
		const m11 = marks(e, 'harmonic-circle', 10);
		expect(m11).toHaveLength(2);
		const m11Upper = must(m11[0], 'M11 beat 1 V1 open-string');
		const m11Lower = must(m11[1], 'M11 beat 3 V2 open-string');
		markBox(e, m11Upper.box, 'M11 B1 V1');
		markBox(e, m11Lower.box, 'M11 B3 V2');

		expect(
			e.check([
				bottomEdge(m10Upper.box) < top9,
				m10Lower.box.y > bot9,
				bottomEdge(m11Upper.box) < top10,
				m11Lower.box.y > bot10,
			]),
		).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('string-double-stop-adjacent-open (p. 397): aligns open-string zeros horizontally with their own notehead in adjacent-second double-stops', async () => {
		const e = await engrave(
			'strings-techniques',
			'string-double-stop-adjacent-open',
		);
		const top = must(e.lines(11)[0], 'measure 12 top stave line');
		const bot = must(e.lines(11)[4], 'measure 12 bottom stave line');
		const space = e.space(11);
		const heads = e.headsIn(11);
		expect(heads).toHaveLength(4);
		const midX =
			(Math.min(...heads.map((h) => centre(h.head))) +
				Math.max(...heads.map((h) => centre(h.head)))) /
			2;
		const beat1Heads = heads
			.filter((h) => centre(h.head) < midX)
			.sort((a, b) => centre(a.head) - centre(b.head));
		const beat3Heads = heads
			.filter((h) => centre(h.head) >= midX)
			.sort((a, b) => centre(a.head) - centre(b.head));
		expect(beat1Heads).toHaveLength(2);
		expect(beat3Heads).toHaveLength(2);
		const beat1Left = must(beat1Heads[0], 'M12 B1 left head');
		const beat1Right = must(beat1Heads[1], 'M12 B1 right head');
		const beat3Left = must(beat3Heads[0], 'M12 B3 left head');
		const beat3Right = must(beat3Heads[1], 'M12 B3 right head');

		const opens = marks(e, 'harmonic-circle', 11);
		expect(opens).toHaveLength(2);
		const beat1Open = must(opens[0], 'M12 B1 open-string');
		const beat3Open = must(opens[1], 'M12 B3 open-string');
		markBox(e, beat1Open.box, 'M12 B1 Open');
		markBox(e, beat3Open.box, 'M12 B3 Open');

		const beat1DistLeft = Math.abs(
			centre(beat1Open.box) - centre(beat1Left.head),
		);
		const beat1DistRight = Math.abs(
			centre(beat1Open.box) - centre(beat1Right.head),
		);
		const beat3DistLeft = Math.abs(
			centre(beat3Open.box) - centre(beat3Left.head),
		);
		const beat3DistRight = Math.abs(
			centre(beat3Open.box) - centre(beat3Right.head),
		);

		expect(
			e.check([
				beat1Open.box.y > bot &&
					beat1DistLeft < beat1DistRight &&
					beat1DistLeft <= 0.35 * space,
				bottomEdge(beat3Open.box) < top &&
					beat3DistRight < beat3DistLeft &&
					beat3DistRight <= 0.35 * space,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('string-two-staves-brace (p. 401): joins two staves of a single stringed instrument with a curly brace', async () => {
		const e = await engrave('strings-two-staves', 'string-two-staves-brace');
		const topStave = e.lines(0, 0, 1);
		const botStave = e.lines(0, 0, 2);
		const topY = must(topStave[0], 'staff 1 top line');
		const botY = must(botStave[4], 'staff 2 bottom line');
		const connectors = e
			.of('staveconnector')
			.filter((ink) => ink.box.h > (botY - topY) * 0.8);
		const brace = must(
			connectors.sort((a, b) => a.box.x - b.box.x)[0],
			'curly brace connector',
		);
		markBox(e, brace.box, 'Brace');
		const midY = Math.round((topY + botY) / 2);
		const leftAt = (y: number) => {
			const near = brace
				.rowYs()
				.filter((ry) => Math.abs(ry - y) <= 4)
				.flatMap((ry) => brace.segmentsAt(ry).map(([x0]) => x0));
			return near.length > 0 ? Math.min(...near) : Infinity;
		};
		const midLeft = leftAt(midY);
		const quarterLeft = leftAt(Math.round(topY + (botY - topY) * 0.25));
		const spansBoth =
			brace.box.y <= topY + 2 && bottomEdge(brace.box) >= botY - 2;
		// A curly brace tips leftward at its vertical centre, unlike a flat vertical line or square bracket.
		const curvesAtMid = midLeft < quarterLeft - 1;
		expect(e.check([spansBoth, curvesAtMid])).toMatchMeasurements([true, true]);
	});

	it.concurrent('string-bowing-mark-above (p. 405): places down-bow and up-bow marks above the stave, aligned with their notehead and above other markings', async () => {
		const e = await engrave('strings-techniques', 'string-bowing-mark-above');
		const top = must(e.lines(12)[0], 'top stave line');
		const space = e.space(12);
		const heads = e.headsIn(12);
		const bowings = [
			...e.inMeasure('down-bow', 12),
			...e.inMeasure('up-bow', 12),
		].sort((a, b) => a.box.x - b.box.x || a.box.y - b.box.y);
		const accents = e.inMeasure('accent', 12);
		const slur = must(onStave(e, 'slur', 12, 8, 8)[0], 'slur');
		expect(bowings).toHaveLength(3);
		expect(accents).toHaveLength(1);
		const accent = must(accents[0], 'beat 3 accent');
		markBox(e, accent.box, 'Accent');
		markBox(e, slur.box, 'Slur');
		const expectedHeads = [
			must(heads[0], 'beat 1 note'),
			must(heads[2], 'beat 3 note'),
			must(heads[3], 'beat 4 note'),
		];
		const ok = bowings.map((mark, i) => {
			markBox(e, mark.box, `Bow ${i + 1}`);
			const head = must(expectedHeads[i], `head ${i + 1}`);
			const aboveStave = bottomEdge(mark.box) < top;
			const aligned =
				Math.abs(centre(mark.box) - centre(head.head)) <= 0.5 * space;
			const clearsAccent = i !== 1 || bottomEdge(mark.box) < accent.box.y;
			const clearsSlur = i !== 0 || bottomEdge(mark.box) < slur.box.y;
			return aboveStave && aligned && clearsAccent && clearsSlur;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('string-bowing-lower-voice-below (p. 405): places the lower voice bowing marks inverted below the stave while the upper voice stays above', async () => {
		const e = await engrave(
			'strings-techniques',
			'string-bowing-lower-voice-below',
		);
		const top = must(e.lines(13)[0], 'measure 14 top stave line');
		const bot = must(e.lines(13)[4], 'measure 14 bottom stave line');
		const bows = [
			...e.inMeasure('down-bow', 13),
			...e.inMeasure('up-bow', 13),
		].sort((a, b) => a.box.y - b.box.y);
		expect(bows).toHaveLength(4);
		for (const [i, mark] of bows.entries()) {
			markBox(e, mark.box, `Bow ${i + 1}`);
		}
		const upper = bows.slice(0, 2);
		const lower = bows.slice(2);
		expect(
			e.check([
				...upper.map((mark) => bottomEdge(mark.box) < top),
				...lower.map((mark) => mark.box.y > bot),
			]),
		).toMatchMeasurements([true, true, true, true]);
	});
});

describe('Behind Bars strings pizzicato and harmonics (pp. 407–423)', () => {
	it.concurrent('draws pizzicato brackets, snap/fingernail/left-hand pizzicato, and natural/artificial harmonics', async () => {
		expect(await draw('strings-pizz-harmonics')).toMatchScreenshot(
			'engraving_strings-pizz-harmonics.png',
		);
	});

	it.concurrent('string-pizz-non-arpeggiate-bracket (p. 409): places a vertical square bracket in front of simultaneous pizzicato chords', async () => {
		const e = await engrave(
			'strings-pizz-harmonics',
			'string-pizz-non-arpeggiate-bracket',
		);
		const space = e.space(0);
		const heads = e.headsIn(0);
		expect(heads).toHaveLength(7);
		const chord1 = must(heads[0], 'chord 1');
		const chord2 = must(heads[3], 'chord 2');
		const ink1 = must(chord1.ink, 'chord 1 ink');
		const ink2 = must(chord2.ink, 'chord 2 ink');
		markBox(e, ink1, 'Chord 1');
		markBox(e, ink2, 'Chord 2');
		expect(
			e.check([
				ink1.x < chord1.head.x - 0.5 * space,
				ink2.x < chord2.head.x - 1.2 * space,
			]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('string-snap-pizzicato-symbol (p. 411): places Bartok snap pizzicato above each note with an upward vertical stroke', async () => {
		const e = await engrave(
			'strings-pizz-harmonics',
			'string-snap-pizzicato-symbol',
		);
		const top = must(e.lines(1)[0], 'top stave line');
		const snaps = marks(e, 'snap-pizzicato', 1);
		expect(snaps).toHaveLength(4);
		const ok = snaps.map((mark, i) => {
			markBox(e, mark.box, `Snap ${i + 1}`);
			const above = bottomEdge(mark.box) < top;
			const midY = mark.box.y + mark.box.h / 2;
			const topRows = mark.rowYs().filter((y) => y < midY);
			const botRows = mark.rowYs().filter((y) => y >= midY);
			const span = (rows: number[]) =>
				Math.max(
					0,
					...rows.map((y) => {
						const segs = mark.segmentsAt(y);
						const first = segs[0];
						const last = segs[segs.length - 1];
						return first && last ? last[1] - first[0] : 0;
					}),
				);
			// Circle sits in the lower half with a narrower upward vertical stroke in the upper half.
			const upwardStem =
				mark.box.h > mark.box.w && span(botRows) > span(topRows);
			return above && upwardStem;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('string-pizz-fingernail (p. 411): places the fingernail pizzicato sign above each note', async () => {
		const e = await engrave('strings-pizz-harmonics', 'string-pizz-fingernail');
		const top = must(e.lines(2)[0], 'top stave line');
		const space = e.space(2);
		const heads = e.headsIn(2);
		const nails = marks(e, 'fingernails', 2);
		expect(nails).toHaveLength(4);
		expect(heads).toHaveLength(4);
		const ok = nails.map((mark, i) => {
			markBox(e, mark.box, `Nail ${i + 1}`);
			const head = must(heads[i], `head ${i + 1}`);
			return (
				bottomEdge(mark.box) < top &&
				Math.abs(centre(mark.box) - centre(head.head)) <= 0.5 * space
			);
		});
		expect(e.check(ok)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('string-left-hand-pizzicato-above (p. 412): places left-hand pizzicato + above the stave in single-voice writing', async () => {
		const e = await engrave(
			'strings-pizz-harmonics',
			'string-left-hand-pizzicato-above',
		);
		const top = must(e.lines(3)[0], 'top stave line');
		const pluses = marks(e, 'stopped', 3);
		expect(pluses).toHaveLength(4);
		const ok = pluses.map((mark, i) => {
			markBox(e, mark.box, `Plus ${i + 1}`);
			return bottomEdge(mark.box) < top;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('string-left-hand-pizzicato-two-voices (p. 412): places voice 1 left-hand pizzicato + above the stave and voice 2 below in two-voice writing', async () => {
		const e = await engrave(
			'strings-pizz-harmonics',
			'string-left-hand-pizzicato-two-voices',
		);
		const top = must(e.lines(4)[0], 'measure 5 top stave line');
		const bot = must(e.lines(4)[4], 'measure 5 bottom stave line');
		const pluses = marks(e, 'stopped', 4);
		expect(pluses).toHaveLength(4);
		const midX =
			(must(pluses[0], 'first').box.x + must(pluses[3], 'last').box.x) / 2;
		const beat1 = pluses
			.filter((m) => centre(m.box) < midX)
			.sort((a, b) => a.box.y - b.box.y);
		const beat3 = pluses
			.filter((m) => centre(m.box) >= midX)
			.sort((a, b) => a.box.y - b.box.y);
		expect(beat1).toHaveLength(2);
		expect(beat3).toHaveLength(2);
		const pairOk = (pair: Ink[], label: string) => {
			const upper = must(pair[0], `${label} upper`);
			const lower = must(pair[1], `${label} lower`);
			markBox(e, upper.box, `${label} V1`);
			markBox(e, lower.box, `${label} V2`);
			return bottomEdge(upper.box) < top && lower.box.y > bot;
		};
		expect(
			e.check([pairOk(beat1, 'B1'), pairOk(beat3, 'B3')]),
		).toMatchMeasurements([true, true]);
	});

	it.concurrent('string-harmonic-natural-circle (p. 414): places a harmonic circle above each sounding-pitch natural harmonic', async () => {
		const e = await engrave(
			'strings-pizz-harmonics',
			'string-harmonic-natural-circle',
		);
		const top = must(e.lines(5)[0], 'top stave line');
		const space = e.space(5);
		const heads = e.headsIn(5);
		const circles = marks(e, 'harmonic-circle', 5);
		expect(circles).toHaveLength(4);
		expect(heads).toHaveLength(4);
		const ok = circles.map((mark, i) => {
			markBox(e, mark.box, `Harm ${i + 1}`);
			const head = must(heads[i], `head ${i + 1}`);
			return (
				bottomEdge(mark.box) < top &&
				Math.abs(centre(mark.box) - centre(head.head)) <= 0.5 * space
			);
		});
		expect(e.check(ok)).toMatchMeasurements([true, true, true, true]);
	});

	it.concurrent('string-harmonic-lower-chord-below (p. 414): places harmonic circles below the stave when only the lower note of a double-stop is a natural harmonic', async () => {
		const e = await engrave(
			'strings-pizz-harmonics',
			'string-harmonic-lower-chord-below',
		);
		const bot = must(e.lines(6)[4], 'measure 7 bottom stave line');
		const circles = marks(e, 'harmonic-circle', 6);
		expect(circles).toHaveLength(2);
		const below = circles.map((mark, i) => {
			markBox(e, mark.box, `M7 Harm ${i + 1}`);
			return mark.box.y > bot;
		});
		expect(e.check(below)).toMatchMeasurements([true, true]);
	});

	it.concurrent('string-harmonic-double-stop-circles (p. 414): stacks two harmonic circles vertically above double-stopped natural harmonics', async () => {
		const e = await engrave(
			'strings-pizz-harmonics',
			'string-harmonic-double-stop-circles',
		);
		const top = must(e.lines(7)[0], 'top stave line');
		const circles = marks(e, 'harmonic-circle', 7);
		expect(circles).toHaveLength(4);
		const midX =
			(must(circles[0], 'first').box.x + must(circles[3], 'last').box.x) / 2;
		const beat1 = circles
			.filter((m) => centre(m.box) < midX)
			.sort((a, b) => a.box.y - b.box.y);
		const beat3 = circles
			.filter((m) => centre(m.box) >= midX)
			.sort((a, b) => a.box.y - b.box.y);
		expect(beat1).toHaveLength(2);
		expect(beat3).toHaveLength(2);
		const stacked = (col: Ink[], prefix: string) =>
			col.every((mark, i) => {
				markBox(e, mark.box, `${prefix} ${i + 1}`);
				const prev = col[i - 1];
				return (
					bottomEdge(mark.box) < top &&
					(prev === undefined || mark.box.y > bottomEdge(prev.box))
				);
			});
		expect(
			e.check([stacked(beat1, 'Beat1'), stacked(beat3, 'Beat3')]),
		).toMatchMeasurements([true, true]);
	});

	// fix: #4752
	it.todo('string-harmonic-diamond-hollow (pp. 418-419): hollow');

	// fix: #4752
	it.todo('string-harmonic-artificial-chord (p. 420): hollow diamond');

	it.concurrent('string-harmonic-double-stop-align (p. 421): vertically aligns each fundamental with its diamond in double-stopped artificial harmonics', async () => {
		const e = await engrave(
			'strings-pizz-harmonics',
			'string-harmonic-double-stop-align',
		);
		const space = e.space(10);
		const heads = e.headsIn(10);
		expect(heads).toHaveLength(8);
		const midX =
			(Math.min(...heads.map((h) => h.head.x)) +
				Math.max(...heads.map((h) => h.head.x))) /
			2;
		const beat1 = heads
			.filter((h) => h.head.x < midX)
			.sort((a, b) => a.head.y - b.head.y);
		const beat3 = heads
			.filter((h) => h.head.x >= midX)
			.sort((a, b) => a.head.y - b.head.y);
		expect(beat1).toHaveLength(4);
		expect(beat3).toHaveLength(4);
		// In beat 1 (C5, G4, E4, B3) and beat 3 (B4, A4, F4, E4), voice 1's pair is (0, 2) or (0, 1) by pitch.
		// Beat 1 sorted high-to-low: C5 (v1 diamond), G4 (v1 base), E4 (v2 diamond), B3 (v2 base) -> pairs (0,1) and (2,3).
		// Beat 3 sorted high-to-low: B4 (v1 diamond), A4 (v2 diamond), F4 (v1 base), E4 (v2 base) -> pairs (0,2) and (1,3).
		const aligned = (
			a: number,
			b: number,
			label: string,
			list: typeof heads,
		) => {
			const ha = must(list[a], `${label} a`);
			const hb = must(list[b], `${label} b`);
			markBox(e, ha.head, `${label} top`);
			markBox(e, hb.head, `${label} base`);
			return Math.abs(centre(ha.head) - centre(hb.head)) <= 0.25 * space;
		};
		expect(
			e.check([
				aligned(0, 1, 'B1-V1', beat1),
				aligned(2, 3, 'B1-V2', beat1),
				aligned(0, 2, 'B3-V1', beat3),
				aligned(1, 3, 'B3-V2', beat3),
			]),
		).toMatchMeasurements([true, true, true, true]);
	});
});

/** Technical marks of one kind in a measure, left to right. */
function marks(e: Engraving, kind: string, measure: number): Ink[] {
	return e
		.inMeasure(kind, measure)
		.sort((a, b) => a.box.x - b.box.x || a.box.y - b.box.y);
}

/** Tight box of the topmost ink band in `mark` above `topLine` (e.g. a fingering drawn in a notehead group). */
function aboveStaveBox(mark: Ink, topLine: number): Box | null {
	const ys = mark.rowYs().filter((y) => y < topLine - 2);
	if (ys.length === 0) {
		return null;
	}
	let minX = Infinity;
	let maxX = -Infinity;
	for (const y of ys) {
		for (const [x0, x1] of mark.segmentsAt(y)) {
			minX = Math.min(minX, x0);
			maxX = Math.max(maxX, x1);
		}
	}
	const minY = must(ys[0], 'top row');
	const maxY = must(ys[ys.length - 1], 'bottom row') + 1;
	return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
