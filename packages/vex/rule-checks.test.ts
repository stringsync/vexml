import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import {
	cropRect,
	parseBookBox,
	parseCrop,
	parseRuleChecks,
} from './rule-checks';

const NOTE = `### The rule

Clefs sit on their lines.

### Checks

1. Does the treble clef curl around the G line?
   Crop: measure 1, 5 spaces
   Book: p. 5, 0.318 0.865 0.068 0.052
2. Do the bass clef's dots sit either side of the F line?
   Crop: measure 5, part 2, staff 2, from 1 spaces, 6 spaces, 7 above, 2 below
   Marks: shown

### Why a person decides

Taste.
`;

describe('parseRuleChecks', () => {
	it('reads each numbered question with its crop, book box, and marks flag', () => {
		const checks = parseRuleChecks(NOTE);
		expect(checks).toHaveLength(2);
		expect(checks[0]).toMatchObject({
			n: 1,
			question: 'Does the treble clef curl around the G line?',
			crop: {
				measure: 1,
				part: 1,
				staff: 1,
				from: 0,
				width: 5,
				above: 4,
				below: 4,
			},
			book: {
				page: '5',
				x: 0.318,
				y: 0.865,
				w: 0.068,
				h: 0.052,
			},
			marks: false,
		});
		expect(checks[1]).toMatchObject({
			n: 2,
			crop: {
				measure: 5,
				part: 2,
				staff: 2,
				from: 1,
				width: 6,
				above: 7,
				below: 2,
			},
			book: null,
			marks: true,
		});
		expect(checks[1]?.source).toContain('Marks: shown');
	});

	it('returns no checks for a note without the section', () => {
		expect(parseRuleChecks('### The rule\n\nStems.')).toEqual([]);
	});

	it('fails loudly on a check it cannot read', () => {
		expect(() =>
			parseRuleChecks('### Checks\n\n1. Is it right\n   Crop: measure 1'),
		).toThrow('is not a question');
		expect(() =>
			parseRuleChecks('### Checks\n\n1. Is it right?\n   Crop: bar 1'),
		).toThrow('cannot read crop');
		expect(() => parseRuleChecks('### Checks\n\n1. Is it right?')).toThrow(
			'no Crop line',
		);
		expect(() => parseBookBox('p. 5, 0.9 0.9 0.2 0.2')).toThrow(
			'out of page bounds',
		);
		expect(() => parseBookBox('page five')).toThrow('cannot read book');
	});

	it('parses every rule note in the integration package', () => {
		const dir = path.resolve(import.meta.dir, '../integration/rules');
		const unreadable = readdirSync(dir)
			.filter((f) => f.endsWith('.md'))
			.flatMap((file) => {
				try {
					parseRuleChecks(readFileSync(path.join(dir, file), 'utf8'));
					return [];
				} catch (error) {
					return [`${file}: ${(error as Error).message}`];
				}
			});
		expect(unreadable).toEqual([]);
	});
});

describe('cropRect', () => {
	const geometry = {
		screenshot: 'engraving_clefs.png',
		measures: [{ index: 0, system: 0, x: 20, w: 200 }],
		staves: [
			{
				part: 0,
				measure: 0,
				staff: 1,
				lines: [100, 110, 120, 130, 140],
				x: 30,
				w: 190,
			},
		],
	};

	it('crops a width in staff spaces from the measure start, padded above and below', () => {
		const rect = cropRect(parseCrop('measure 1, 5 spaces'), geometry, {
			width: 400,
			height: 300,
		});
		expect(rect).toEqual({ x: 15, y: 60, w: 50, h: 120, space: 10 });
	});

	it('runs to the measure end without a width, and clamps to the image', () => {
		const rect = cropRect(parseCrop('measure 1, 9 above'), geometry, {
			width: 210,
			height: 300,
		});
		expect(rect).toEqual({ x: 15, y: 10, w: 195, h: 170, space: 10 });
	});

	it('is null for a staff the render lacks', () => {
		expect(
			cropRect(parseCrop('measure 2'), geometry, { width: 400, height: 300 }),
		).toBeNull();
	});
});
