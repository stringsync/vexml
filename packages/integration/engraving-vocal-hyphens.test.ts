import { describe, expect, it } from 'bun:test';
import { draw, engrave, must } from './engraving-render';
import { markBox } from './engraving-spacing-measures';

// Behind Bars, pp. 448–449: vocal hyphens centred at mid-height (never extenders between
// syllables), regular hyphen spacing across wide melismas, and system-break hyphens.

describe('Behind Bars vocal hyphens (pp. 448–449)', () => {
	it.concurrent('draws vocal-hyphens', async () => {
		expect(await draw('vocal-hyphens')).toMatchScreenshot(
			'engraving_vocal-hyphens.png',
		);
	});

	it.concurrent('vocal-hyphen-mid-height-not-extender (p. 448): centres hyphens at mid-height between syllables rather than using baseline extenders', async () => {
		const e = await engrave(
			'vocal-hyphens',
			'vocal-hyphen-mid-height-not-extender',
		);
		const bottomLine = must(e.lines(0).at(-1), 'bottom stave line');
		const space = e.space(0);
		const marks = e
			.inMeasure('lyric', 0)
			.filter((l) => l.box.y > bottomLine && l.box.y < bottomLine + space * 6.5)
			.sort((a, b) => a.box.x - b.box.x);
		const syllables = marks.filter((m) => m.box.h > space * 0.4);
		const hyphens = marks.filter((m) => m.box.h <= space * 0.4);
		expect(syllables.length).toBe(4);
		expect(hyphens.length).toBe(2);
		for (const h of hyphens) {
			markBox(e, h.box, 'Centred hyphen');
		}
		const val = must(syllables[0], 'val');
		const h1 = must(hyphens[0], 'hyphen between val and ley');
		const ley = must(syllables[1], 'ley');
		const gleam = must(syllables[2], 'gleam');
		const h2 = must(hyphens[1], 'hyphen between gleam and ing');
		const ing = must(syllables[3], 'ing');
		const h1Mid = h1.box.x + h1.box.w / 2;
		const gap1Mid = (val.box.x + val.box.w + ley.box.x) / 2;
		const h2Mid = h2.box.x + h2.box.w / 2;
		const gap2Mid = (gleam.box.x + gleam.box.w + ing.box.x) / 2;
		const centredHorizontally =
			Math.abs(h1Mid - gap1Mid) <= space * 0.6 &&
			Math.abs(h2Mid - gap2Mid) <= space * 0.6;
		// Short hyphen (not a long extender) positioned at mid-height of the syllables (above baseline).
		const shortNotExtender = hyphens.every((h) => h.box.w < space);
		const midHeight = hyphens.every(
			(h) => h.box.y > val.box.y && h.box.y + h.box.h < val.box.y + val.box.h,
		);
		expect(
			e.check([centredHorizontally, shortNotExtender, midHeight]),
		).toMatchMeasurements([true, true, true]);
	});

	// fix: #4768
	it.todo('vocal-hyphen-regular-intervals (p. 448): draws even hyphens');

	it.concurrent('vocal-hyphen-system-break (p. 448): adds end-of-system and start-of-new-system hyphens across a system break and cautionary signatures', async () => {
		const e = await engrave('vocal-hyphens', 'vocal-hyphen-system-break');
		const bandOf = (m: number) => {
			const bottom = must(e.lines(m).at(-1), `bottom line m${m}`);
			const sp = e.space(m);
			return e
				.inMeasure('lyric', m)
				.filter((l) => l.box.y > bottom && l.box.y < bottom + sp * 6.5)
				.sort((a, b) => a.box.x - b.box.x);
		};
		const space = e.space(3);
		const m4 = bandOf(3);
		const m4Hyphens = m4.filter((l) => l.box.h <= space * 0.4);
		const m4Syllables = m4.filter((l) => l.box.h > space * 0.4);
		const m5 = bandOf(4);
		const m5Hyphens = m5.filter((l) => l.box.h <= space * 0.4);
		const m5Syllables = m5.filter((l) => l.box.h > space * 0.4);
		const m7 = bandOf(6);
		const m7Hyphens = m7.filter((l) => l.box.h <= space * 0.4);
		const m7Syllables = m7.filter((l) => l.box.h > space * 0.4);
		for (const h of [...m4Hyphens, ...m5Hyphens, ...m7Hyphens]) {
			markBox(e, h.box, 'Break hyphen');
		}
		const di = must(m4Syllables.at(-1), 'di in m4');
		const trailingM4 = must(m4Hyphens.at(-1), 'trailing hyphen in m4');
		const ant = must(m5Syllables[0], 'ant in m5');
		const leadingM5 = must(m5Hyphens[0], 'leading hyphen in m5');
		const ing = must(m7Syllables[0], 'ing in m7');
		const leadingM7 = must(m7Hyphens[0], 'leading hyphen in m7');
		const hasTrailingBeforeSignatures = trailingM4.box.x > di.box.x + di.box.w;
		const hasLeadingM5 = leadingM5.box.x + leadingM5.box.w < ant.box.x;
		const hasLeadingM7 = leadingM7.box.x + leadingM7.box.w < ing.box.x;
		expect(
			e.check([hasTrailingBeforeSignatures, hasLeadingM5, hasLeadingM7]),
		).toMatchMeasurements([true, true, true]);
	});
});
