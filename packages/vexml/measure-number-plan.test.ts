import { describe, expect, it } from 'bun:test';
import type { MeasureNumbering } from './config';
import { DefaultScoreParser } from './default-score-parser';
import { DynamicGlyphs } from './dynamic-glyphs';
import { MeasureNumberPlan } from './measure-number-plan';
import { ScoreReader } from './score-reader';
import { StavePlan } from './stave-plan';

describe('MeasureNumberPlan', () => {
	it('shows no measure numbers under none', async () => {
		const plan = await planOf('none', [part('P1', 3)]);
		expect(plan.numbers(0, '1', 0, true)).toBe(false);
	});

	it('numbers only system starts under system', async () => {
		const plan = await planOf('system', [part('P1', 4)]);
		expect(plan.numbers(0, '1', 3, true)).toBe(true);
		expect(plan.numbers(0, '1', 3, false)).toBe(false);
	});

	it('numbers every measure under every', async () => {
		const plan = await planOf('every', [part('P1', 4)]);
		expect(plan.numbers(0, '1', 3, false)).toBe(true);
	});

	it('numbers every Nth measure plus system starts under every-N', async () => {
		const two = await planOf('every-2', [part('P1', 5)]);
		expect(two.numbers(0, '1', 2, false)).toBe(true);
		expect(two.numbers(0, '1', 3, false)).toBe(false);
		expect(two.numbers(0, '1', 3, true)).toBe(true);
		const three = await planOf('every-3', [part('P1', 5)]);
		expect(three.numbers(0, '1', 3, false)).toBe(true);
		expect(three.numbers(0, '1', 4, false)).toBe(false);
	});

	it('numbers only the top stave under a configured mode', async () => {
		const plan = await planOf('every', [part('P1', 2), part('P2', 2)]);
		expect(plan.numbers(0, '1', 1, false)).toBe(true);
		expect(plan.numbers(1, '1', 1, false)).toBe(false);
	});

	it('numbers system starts when the document sets no measure-numbering', async () => {
		const plan = await planOf('document', [part('P1', 2)]);
		expect(plan.numbers(0, '1', 0, true)).toBe(true);
		expect(plan.numbers(0, '1', 1, false)).toBe(false);
	});

	it("follows the document's value from where it is set", async () => {
		const plan = await planOf('document', [
			part('P1', 4, {
				prints: {
					0: '<measure-numbering>measure</measure-numbering>',
					2: '<measure-numbering>none</measure-numbering>',
				},
			}),
		]);
		expect(plan.numbers(0, '1', 1, false)).toBe(true);
		expect(plan.numbers(0, '1', 2, true)).toBe(false);
		expect(plan.numbers(0, '1', 3, true)).toBe(false);
	});

	it('lets an explicit config value override the document', async () => {
		const plan = await planOf('every', [
			part('P1', 2, {
				prints: { 0: '<measure-numbering>none</measure-numbering>' },
			}),
		]);
		expect(plan.numbers(0, '1', 1, false)).toBe(true);
	});

	it('numbers the top part once when every part repeats the mark', async () => {
		const mark = { 0: '<measure-numbering>measure</measure-numbering>' };
		const plan = await planOf('document', [
			part('P1', 2, { prints: mark }),
			part('P2', 2, { prints: mark }),
		]);
		expect(plan.numbers(0, '1', 1, false)).toBe(true);
		expect(plan.numbers(1, '1', 1, false)).toBe(false);
	});

	it('numbers the bottom part under only-bottom', async () => {
		const plan = await planOf('document', [
			part('P1', 2, {
				prints: {
					0: '<measure-numbering system="only-bottom">measure</measure-numbering>',
				},
			}),
			part('P2', 2),
		]);
		expect(plan.numbers(0, '1', 1, false)).toBe(false);
		expect(plan.numbers(1, '1', 1, false)).toBe(true);
	});

	it('numbers the declaring part and the top under also-top', async () => {
		const plan = await planOf('document', [
			part('P1', 2),
			part('P2', 2, {
				prints: {
					0: '<measure-numbering system="also-top">measure</measure-numbering>',
				},
			}),
			part('P3', 2),
		]);
		expect(plan.numbers(0, '1', 1, false)).toBe(true);
		expect(plan.numbers(1, '1', 1, false)).toBe(true);
		expect(plan.numbers(2, '1', 1, false)).toBe(false);
	});

	it('numbers the staff the mark names under none', async () => {
		const plan = await planOf('document', [
			part('P1', 2, {
				prints: {
					0: '<measure-numbering system="none" staff="2">measure</measure-numbering>',
				},
				staves: 2,
			}),
		]);
		expect(plan.numbers(0, '1', 1, false)).toBe(false);
		expect(plan.numbers(0, '2', 1, false)).toBe(true);
	});

	it('never numbers an implicit measure under the document', async () => {
		const plan = await planOf('document', [
			part('P1', 2, {
				prints: { 0: '<measure-numbering>measure</measure-numbering>' },
				pickup: true,
			}),
		]);
		expect(plan.numbers(0, '1', 0, true)).toBe(false);
		expect(plan.numbers(0, '1', 1, false)).toBe(true);
	});
});

/* A part of `count` measures, `prints` holding the <print> content by measure index; with
 * `staves` > 1 the first measure declares them, and `pickup` makes the first implicit. */
function part(
	id: string,
	count: number,
	opts: {
		prints?: Record<number, string>;
		staves?: number;
		pickup?: boolean;
	} = {},
): { id: string; xml: string } {
	const { prints = {}, staves = 1, pickup = false } = opts;
	const measures = Array.from({ length: count }, (_, m) => {
		const print = prints[m] ? `<print>${prints[m]}</print>` : '';
		const attributes =
			m === 0 ? `<attributes><staves>${staves}</staves></attributes>` : '';
		const implicit = pickup && m === 0 ? ' implicit="yes"' : '';
		return `<measure number="${m + 1}"${implicit}>${print}${attributes}</measure>`;
	});
	return { id, xml: `<part id="${id}">${measures.join('')}</part>` };
}

async function planOf(
	mode: MeasureNumbering,
	parts: { id: string; xml: string }[],
): Promise<MeasureNumberPlan> {
	const list = parts
		.map((p) => `<score-part id="${p.id}"><part-name/></score-part>`)
		.join('');
	const mdoc = await new DefaultScoreParser().parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
	<part-list>${list}</part-list>
	${parts.map((p) => p.xml).join('')}
</score-partwise>`);
	return new MeasureNumberPlan(
		new ScoreReader(new DynamicGlyphs()),
		new StavePlan({ showTabs: true, showNotation: true }),
		mdoc.score.parts,
		{ mode },
	);
}
