import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { centre, markBox } from './engraving-spacing-measures';
import { bottomEdge, rightEdge } from './engraving-spanners';

describe('Behind Bars keyboard conventions (pp. 301–313)', () => {
	it.concurrent('draws keyboard system, parenthesized unison and cross-staff ties', async () => {
		expect(await draw('keyboard-system')).toMatchScreenshot(
			'engraving_keyboard-system.png',
		);
	});

	it.concurrent('draws keyboard fingering placement, chord stacking and substitutions', async () => {
		expect(await draw('keyboard-fingering')).toMatchScreenshot(
			'engraving_keyboard-fingering.png',
		);
	});

	it.concurrent('draws three-voice keyboard part-writing on a single stave', async () => {
		expect(await draw('keyboard-three-voices')).toMatchScreenshot(
			'engraving_keyboard-three-voices.png',
		);
	});

	it.concurrent('kbd-braced-system (p. 303): joins two keyboard staves with a curly brace spanning from the upper top line to the lower bottom line', async () => {
		const e = await engrave('keyboard-system', 'kbd-braced-system');
		const upperTop = must(e.lines(0, 0, 1)[0], 'upper stave top');
		const lowerBottom = must(e.lines(0, 0, 2)[4], 'lower stave bottom');
		const m1 = e.measureRect(0);
		const space = e.space(0);
		const span = lowerBottom - upperTop;
		// Find the brace ink at the left edge of measure 1 spanning the full grand staff height.
		const braces = e.inks.filter(
			(ink) =>
				ink.box.x < m1.x + space &&
				ink.box.h >= span * 0.85 &&
				ink.box.w >= 0.4 * space &&
				ink.box.w <= 3 * space &&
				ink.box.y <= upperTop + space &&
				bottomEdge(ink.box) >= lowerBottom - space,
		);
		expect(braces.length).toBeGreaterThanOrEqual(1);
		const brace = must(braces[0], 'curly brace');
		markBox(e, brace.box, 'Curly brace');
		const alignsEdges =
			Math.abs(brace.box.y - upperTop) <= space &&
			Math.abs(bottomEdge(brace.box) - lowerBottom) <= space;
		expect(e.check(alignsEdges)).toMatchMeasurements(true);
	});

	it.concurrent('kbd-unison-both-hands-parentheses (p. 308): encloses the secondary unison notehead in parentheses', async () => {
		const e = await engrave(
			'keyboard-system',
			'kbd-unison-both-hands-parentheses',
		);
		const upper = e.headsIn(1, { part: 0, voice: '1' });
		const parenthesized = must(upper[4], 'parenthesized C4');
		const plain = must(upper[0], 'plain E4');
		markBox(e, parenthesized.ink ?? parenthesized.head, 'Parenthesized C4');
		markBox(e, plain.ink ?? plain.head, 'Plain E4');
		const parenInk = parenthesized.ink ?? parenthesized.head;
		const plainInk = plain.ink ?? plain.head;
		// Parentheses widen the note's ink box noticeably beyond a plain notehead.
		const widened = parenInk.w > plainInk.w + 0.4 * e.space(1);
		expect(e.check(widened)).toMatchMeasurements(true);
	});

	it.concurrent('kbd-tie-cross-staff (p. 308): cross-staff ties connect directly between both noteheads', async () => {
		const e = await engrave('keyboard-system', 'kbd-tie-cross-staff');
		const connects = (measure: number, label: string): boolean => {
			const space = e.space(measure);
			const heads = e.headsIn(measure, { part: 0, voice: '2' });
			const start = must(heads[0], `${label} start`).head;
			const stop = must(heads[1], `${label} stop`).head;
			const ties = e.inMeasure('tie', measure);
			if (ties.length !== 1) {
				return false;
			}
			const tie = must(ties[0], `${label} tie`);
			markBox(e, start, `${label} start`);
			markBox(e, stop, `${label} stop`);
			markBox(e, tie.box, `${label} tie`);
			const topHead = start.y < stop.y ? start : stop;
			const bottomHead = start.y < stop.y ? stop : start;
			return (
				tie.box.x >= start.x - 0.5 * space &&
				tie.box.x <= rightEdge(start) + 0.5 * space &&
				rightEdge(tie.box) >= stop.x - 0.5 * space &&
				rightEdge(tie.box) <= rightEdge(stop) + 0.5 * space &&
				tie.box.y <= bottomEdge(topHead) + space &&
				bottomEdge(tie.box) >= bottomHead.y - space
			);
		};
		const downward = connects(2, 'Downward');
		const upward = connects(3, 'Upward');
		expect(e.check([downward, upward])).toMatchMeasurements([true, true]);
	});

	it.concurrent('kbd-fingering-side-default (p. 309): places unplaced upper-stave fingerings above and lower-stave fingerings below', async () => {
		const e = await engrave('keyboard-fingering', 'kbd-fingering-side-default');
		const m1 = e.measureRect(0);
		const space = e.space(0);
		const upperLines = e.lines(0, 0, 1);
		const lowerLines = e.lines(0, 0, 2);
		const upperTop = must(upperLines[0], 'upper stave top');
		const upperBottom = must(upperLines[4], 'upper stave bottom');
		const lowerTop = must(lowerLines[0], 'lower stave top');
		const lowerBottom = must(lowerLines[4], 'lower stave bottom');
		const heads = e
			.of('notehead')
			.filter((t) => centre(t.box) >= m1.x && centre(t.box) <= rightEdge(m1));
		const above = heads.filter((t) => t.box.y < upperTop - space);
		const below = heads.filter((t) => bottomEdge(t.box) > lowerBottom + space);
		for (const t of above) {
			markBox(e, t.box, 'Upper fingering');
		}
		for (const t of below) {
			markBox(e, t.box, 'Lower fingering');
		}
		const middleClear =
			above.every((t) => bottomEdge(t.box) <= upperBottom + 0.5 * space) &&
			below.every((t) => t.box.y >= lowerTop - 0.5 * space);
		expect(
			e.check([above.length === 4, below.length === 4, middleClear]),
		).toMatchMeasurements([true, true, true]);
	});

	it.concurrent('kbd-fingering-chord-stack (p. 309): stacks chord fingerings vertically outside the stave', async () => {
		const e = await engrave('keyboard-fingering', 'kbd-fingering-chord-stack');
		const m2 = e.measureRect(1);
		const space = e.space(1);
		const staves = e
			.of('stave')
			.filter((s) => centre(s.box) >= m2.x && centre(s.box) <= rightEdge(m2))
			.sort((a, b) => a.box.y - b.box.y);
		const upperTop = must(staves[0], 'upper stave').box.y;
		const lowerBottom = bottomEdge(must(staves[1], 'lower stave').box);
		const heads = e
			.of('notehead')
			.filter((t) => centre(t.box) >= m2.x && centre(t.box) <= rightEdge(m2));
		const above = heads.filter((t) => t.box.y < upperTop - 2 * space);
		const below = heads.filter(
			(t) => bottomEdge(t.box) > lowerBottom + 2 * space,
		);
		for (const t of [...above, ...below]) {
			markBox(e, t.box, 'Chord fingering stack');
		}
		const aboveTop = Math.min(...above.map((t) => t.box.y));
		const belowBot = Math.max(...below.map((t) => bottomEdge(t.box)));
		const stackedAbove = above.length > 0 && upperTop - aboveTop >= 3 * space;
		const stackedBelow =
			below.length > 0 && belowBot - lowerBottom >= 3 * space;
		expect(e.check([stackedAbove, stackedBelow])).toMatchMeasurements([
			true,
			true,
		]);
	});

	// fix: #4762
	it.todo('kbd-fingering-inner-voice (p. 309): lower-voice fingering below');

	it.concurrent('kbd-fingering-substitution (p. 309): draws finger substitutions joining both numerals clear of the stave', async () => {
		const e = await engrave('keyboard-fingering', 'kbd-fingering-substitution');
		const m4 = e.measureRect(3);
		const space = e.space(3);
		const staves = e
			.of('stave')
			.filter((s) => centre(s.box) >= m4.x && centre(s.box) <= rightEdge(m4))
			.sort((a, b) => a.box.y - b.box.y);
		const upperTop = must(staves[0], 'upper stave').box.y;
		const lowerBottom = bottomEdge(must(staves[1], 'lower stave').box);
		const heads = e
			.of('notehead')
			.filter((t) => centre(t.box) >= m4.x && centre(t.box) <= rightEdge(m4));
		const above = heads.filter(
			(t) => t.box.y < upperTop - space && t.box.w >= 1.4 * space,
		);
		const below = heads.filter(
			(t) => bottomEdge(t.box) > lowerBottom + space && t.box.w >= 1.4 * space,
		);
		for (const t of [...above, ...below]) {
			markBox(e, t.box, 'Substitution');
		}
		expect(e.check([above.length >= 2, below.length >= 1])).toMatchMeasurements(
			[true, true],
		);
	});

	// fix: #4763
	it.todo('kbd-three-voices-same-stem-offset (p. 313): lower voice right');

	it.concurrent('kbd-three-voices-flag-beam-right (p. 313): moves a beamed same-direction voice to the right of the un-beamed voice', async () => {
		const e = await engrave(
			'keyboard-three-voices',
			'kbd-three-voices-flag-beam-right',
		);
		const v2 = e.headsIn(1, { part: 0, voice: '2' });
		const v3 = e.headsIn(1, { part: 0, voice: '3' });
		const space = e.space(1);
		// Beat 1: v2[0] (beamed B4) vs v3[0] (half E4); Beat 3: v2[4] (beamed B4) vs v3[1] (half D4).
		const pairs: [number, number][] = [
			[0, 0],
			[4, 1],
		];
		const ok = pairs.map(([i2, i3], idx) => {
			const beamed = must(v2[i2], `v2[${i2}]`);
			const plain = must(v3[i3], `v3[${i3}]`);
			markBox(e, beamed.head, `v2 beamed #${idx + 1}`);
			markBox(e, plain.head, `v3 plain #${idx + 1}`);
			return beamed.head.x > plain.head.x + 0.3 * space;
		});
		expect(e.check(ok)).toMatchMeasurements([true, true]);
	});
});

describe('Behind Bars keyboard conventions (pp. 314–328)', () => {
	it.concurrent('draws cross-staff beams, angles, subdivisions, articulations and rests', async () => {
		expect(await draw('keyboard-cross-staff-beams')).toMatchScreenshot(
			'engraving_keyboard-cross-staff-beams.png',
		);
	});

	it.concurrent('draws cross-staff beamed and unbeamed tuplets', async () => {
		expect(await draw('keyboard-cross-staff-tuplets')).toMatchScreenshot(
			'engraving_keyboard-cross-staff-tuplets.png',
		);
	});

	it.concurrent('draws cross-staff slurs', async () => {
		expect(await draw('keyboard-cross-staff-slurs')).toMatchScreenshot(
			'engraving_keyboard-cross-staff-slurs.png',
		);
	});

	it.concurrent('draws keyboard dynamics, hairpins and cross-staff glissandos', async () => {
		expect(await draw('keyboard-dynamics-glissando')).toMatchScreenshot(
			'engraving_keyboard-dynamics-glissando.png',
		);
	});

	// fix: #4758
	it.todo('kbd-cross-staff-beam-between-staves (pp. 314–315): beam between');

	// fix: #4758
	it.todo('kbd-cross-staff-beam-angle (p. 315): cross-staff beam slope');

	// fix: #4758
	it.todo('kbd-cross-staff-additional-beams (pp. 316–317): secondary beams');

	// fix: #4758
	it.todo('kbd-cross-staff-articulation (p. 317): outer-side articulations');

	it.concurrent('kbd-cross-staff-beam-rest-clear (p. 319): keeps internal rests clear of cross-staff beams', async () => {
		const e = await engrave(
			'keyboard-cross-staff-beams',
			'kbd-cross-staff-beam-rest-clear',
		);
		const m5 = e.measureRect(4);
		const beams = e
			.of('beam')
			.filter((b) => centre(b.box) >= m5.x && centre(b.box) <= rightEdge(m5));
		const rests = e.restsIn(4);
		for (const r of rests) {
			markBox(e, r.ink ?? r.head, 'Rest');
		}
		for (const b of beams) {
			markBox(e, b.box, 'Beam');
		}
		const clear =
			rests.length >= 2 &&
			beams.length >= 2 &&
			rests.every((r) => {
				const box = r.ink ?? r.head;
				const rx = Math.round(centre(box));
				return beams.every((b) => {
					if (rx < b.box.x || rx > rightEdge(b.box)) {
						return true;
					}
					const bands = b.bandsAt(rx);
					return bands.every(
						([top, bot]) => bottomEdge(box) <= top || box.y >= bot,
					);
				});
			});
		expect(e.check(clear)).toMatchMeasurements(true);
	});

	// fix: #4771
	it.todo('kbd-cross-staff-tuplet-beamed (pp. 319–320): beamed tuplets');

	it.todo('kbd-cross-staff-tuplet-unbeamed (p. 320): unbeamed tuplets');

	// fix: #4756
	it.todo('kbd-slur-cross-staff (p. 321): smooth cross-staff slurs');

	// fix: #4772
	it.todo('kbd-slur-cross-staff-beam (p. 322): majority-side beamed slurs');

	it.concurrent('kbd-dynamics-between-staves (p. 323): centres shared keyboard dynamics between the two staves', async () => {
		const e = await engrave(
			'keyboard-dynamics-glissando',
			'kbd-dynamics-between-staves',
		);
		const m1 = e.measureRect(0);
		const upperBottom = must(e.lines(0, 0, 1)[4], 'upper stave bottom');
		const lowerTop = must(e.lines(0, 0, 2)[0], 'lower stave top');
		const dyns = e
			.of('words')
			.filter((d) => centre(d.box) >= m1.x && centre(d.box) <= rightEdge(m1));
		for (const d of dyns) {
			markBox(e, d.box, 'Dynamic');
		}
		const between =
			dyns.length >= 2 &&
			dyns.every(
				(d) => d.box.y >= upperBottom && bottomEdge(d.box) <= lowerTop,
			);
		expect(e.check(between)).toMatchMeasurements(true);
	});

	it.concurrent('kbd-hairpin-cross-staff-beam (pp. 323–324): keeps hairpins clear of cross-staff beams', async () => {
		const e = await engrave(
			'keyboard-dynamics-glissando',
			'kbd-hairpin-cross-staff-beam',
		);
		const m2 = e.measureRect(1);
		const beams = e
			.of('beam')
			.filter((b) => centre(b.box) >= m2.x && centre(b.box) <= rightEdge(m2));
		const wedges = e
			.of('hairpin')
			.filter((w) => centre(w.box) >= m2.x && centre(w.box) <= rightEdge(m2));
		for (const w of wedges) {
			markBox(e, w.box, 'Hairpin');
		}
		for (const b of beams) {
			markBox(e, b.box, 'Beam');
		}
		const overlaps = (
			a: { x: number; y: number; w: number; h: number },
			b: { x: number; y: number; w: number; h: number },
		) =>
			a.x < rightEdge(b) &&
			rightEdge(a) > b.x &&
			a.y < bottomEdge(b) &&
			bottomEdge(a) > b.y;
		const clear =
			wedges.length >= 1 &&
			beams.length >= 2 &&
			wedges.every((w) => beams.every((b) => !overlaps(w.box, b.box)));
		expect(e.check(clear)).toMatchMeasurements(true);
	});

	// fix: #4757
	it.todo('kbd-glissando-cross-staff (p. 326): cross-staff glissandos');
});
