import { describe, expect, it } from 'bun:test';
import { extractDrawFixtures, sliceRuleCheck } from './rule-check-slice';

describe('sliceRuleCheck', () => {
	it('slices a single-rule describe file, skipping the screenshot-only test and unused helpers', () => {
		const slice = sliceRuleCheck(SINGLE_RULE_FILE, 'stem-length');
		expect(slice).not.toBeNull();
		expect(slice?.state).toBe('active');
		expect(slice?.source).toContain('toMatchMeasurements');
		expect(slice?.source).toContain('async function stemLengths');
		expect(slice?.source).not.toContain('toMatchScreenshot');
		expect(slice?.source).not.toContain('unusedHelper');
	});

	it('isolates one rule and its transitive helpers in a multi-rule file', () => {
		const cClef = sliceRuleCheck(MULTI_RULE_FILE, 'clef-c-centred');
		expect(cClef?.state).toBe('active');
		expect(cClef?.fixtures).toEqual(['clefs']);
		expect(cClef?.source).toContain('cClefOffsets');
		expect(cClef?.source).toContain('clefsOf');
		expect(cClef?.source).toContain('centreY');
		expect(cClef?.source).not.toContain('barlineSides');
		expect(cClef?.source).not.toContain('percussionClefs');

		const percussion = sliceRuleCheck(
			MULTI_RULE_FILE,
			'clef-percussion-centred',
		);
		expect(percussion?.fixtures).toEqual(['clef-percussion']);
		expect(percussion?.source).toContain('percussionClefs');
		expect(percussion?.source).toContain('centreY');
		expect(percussion?.source).not.toContain('clefsOf');
	});

	it('keeps a rule slice unchanged when a sibling rule in the same file changes', () => {
		const before = sliceRuleCheck(MULTI_RULE_FILE, 'clef-c-centred');
		const edited = MULTI_RULE_FILE.replace(
			"it.todo('clef-change-before-barline",
			"it.concurrent('clef-change-before-barline",
		).replace("return e.measures.map(() => 'before');", "return ['before'];");
		const after = sliceRuleCheck(edited, 'clef-c-centred');
		expect(after?.source).toBe(before?.source);

		const changedRule = sliceRuleCheck(edited, 'clef-change-before-barline');
		expect(changedRule?.state).toBe('active');
		expect(
			sliceRuleCheck(MULTI_RULE_FILE, 'clef-change-before-barline')?.state,
		).toBe('todo');
	});

	it('moves only the rules that call a shared helper when that helper changes', () => {
		const edited = MULTI_RULE_FILE.replace(
			'return { e, m };',
			'return { e, m: m + 1 };',
		);
		// clef-c-centred and clef-change-before-barline call clefsOf; clef-percussion-centred does not.
		expect(sliceRuleCheck(edited, 'clef-c-centred')?.source).not.toBe(
			sliceRuleCheck(MULTI_RULE_FILE, 'clef-c-centred')?.source,
		);
		expect(
			sliceRuleCheck(edited, 'clef-change-before-barline')?.source,
		).not.toBe(
			sliceRuleCheck(MULTI_RULE_FILE, 'clef-change-before-barline')?.source,
		);
		expect(sliceRuleCheck(edited, 'clef-percussion-centred')?.source).toBe(
			sliceRuleCheck(MULTI_RULE_FILE, 'clef-percussion-centred')?.source,
		);
	});

	it('respects kebab-case boundaries and returns null for eye-only rules', () => {
		expect(sliceRuleCheck(SINGLE_RULE_FILE, 'stem')).toBeNull();
		expect(sliceRuleCheck(MULTI_RULE_FILE, 'clef-g-f-on-line')).toBeNull();
	});

	it('handles template expressions, comments, and regex literals inside helpers', () => {
		const src = `
const tag = (n: number) => \`rule-\${helper(n)}/\${/a[\\/]b/.test('a/b')}\`;
// fake } inside comment
function helper(n: number) { return n / 2; }
it('demo-rule: checks template', () => {
	expect(tag(4)).toBe('rule-2/true');
});
`;
		const slice = sliceRuleCheck(src, 'demo-rule');
		expect(slice?.source).toContain('const tag');
		expect(slice?.source).toContain('function helper');
	});

	it('extracts draw fixtures from a test file', () => {
		expect(extractDrawFixtures(MULTI_RULE_FILE)).toEqual([
			'clefs',
			'clef-percussion',
		]);
	});
});

const SINGLE_RULE_FILE = `
import { describe, expect, it } from 'bun:test';
import { draw, engrave, quarters } from './engraving-render';

describe('stem-length (Behind Bars p. 14)', () => {
	it.concurrent('draws stem-length', async () => {
		expect(await draw('stem-length')).toMatchScreenshot(
			'engraving_stem-length.png',
		);
	});

	it.concurrent('draws stems 3½ spaces long (p. 14)', async () => {
		expect(await stemLengths('stem-length')).toMatchMeasurements([
			[3.5, 3.5],
		]);
	});
});

async function stemLengths(file: string) {
	const e = await engrave(file);
	return e.check(e.measures.map((m) => quarters(m, e.space(m))));
}

function unusedHelper() {
	return 42;
}
`;

const MULTI_RULE_FILE = `
import { describe, expect, it } from 'bun:test';
import { draw, engrave } from './engraving-render';

describe('Behind Bars clefs (pp. 5-9)', () => {
	it.concurrent('draws clefs', async () => {
		expect(await draw('clefs')).toMatchScreenshot('engraving_clefs.png');
	});

	it.concurrent('draws clef-percussion', async () => {
		expect(await draw('clef-percussion')).toMatchScreenshot('engraving_clef-percussion.png');
	});

	it.concurrent('clef-c-centred (p. 6): centres C clefs', async () => {
		expect(await cClefOffsets()).toEqual([0, 0]);
	});

	it.todo('clef-change-before-barline (p. 8): barline order', async () => {
		expect(await barlineSides()).toEqual(['before']);
	});

	it.concurrent('clef-percussion-centred (p. 6): percussion', async () => {
		expect(await percussionClefs()).toEqual({ fiveLine: 0 });
	});
});

const centreY = (y: number, h: number) => y + h / 2;

async function clefsOf(m: number) {
	const e = await engrave('clefs');
	return { e, m };
}

async function cClefOffsets() {
	const { e } = await clefsOf(0);
	return [centreY(0, e.space())];
}

async function barlineSides() {
	const { e } = await clefsOf(1);
	return e.measures.map(() => 'before');
}

async function percussionClefs() {
	const e = await engrave('clef-percussion');
	return { fiveLine: centreY(0, e.space()) };
}
`;
