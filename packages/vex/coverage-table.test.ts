import { describe, expect, it } from 'bun:test';
import { CoverageTable } from './coverage-table';

const SCHEMA = new Map([
	['accent', new Set(['placement', 'color'])],
	['fermata', new Set(['type', 'color'])],
	['midi-instrument', new Set(['id'])],
]);

describe('CoverageTable', () => {
	it('adds a missing row for each element it lacks', () => {
		const table = new CoverageTable([]).sync(SCHEMA);
		expect(table.rows.map((r) => [r.element, r.status])).toEqual([
			['accent', 'missing'],
			['fermata', 'missing'],
			['midi-instrument', 'missing'],
		]);
	});

	it('keeps the status and note of a row it has', () => {
		const table = new CoverageTable([
			{ element: 'midi-instrument', status: 'ignored', note: 'sound' },
		]).sync(SCHEMA);
		expect(table.rows[2]).toEqual({
			element: 'midi-instrument',
			status: 'ignored',
			note: 'sound',
		});
	});

	it('puts attribute rows under their element, shared ones first', () => {
		const table = new CoverageTable([
			{ element: 'fermata', attribute: 'type', status: 'drawn', note: '' },
			{ element: '*', attribute: 'color', status: 'drawn', note: '' },
		]).sync(SCHEMA);
		expect(table.rows.map((r) => `${r.element}@${r.attribute}`)).toEqual([
			'*@color',
			'accent@undefined',
			'fermata@undefined',
			'fermata@type',
			'midi-instrument@undefined',
		]);
	});

	it('throws on an element the schema lacks', () => {
		const table = new CoverageTable([
			{ element: 'fermatta', status: 'drawn', note: '' },
		]);
		expect(() => table.sync(SCHEMA)).toThrow('fermatta is not in');
	});

	it('throws on an attribute its element does not take', () => {
		const table = new CoverageTable([
			{ element: 'accent', attribute: 'type', status: 'drawn', note: '' },
		]);
		expect(() => table.sync(SCHEMA)).toThrow('accent@type is not in');
	});

	it('throws on a shared attribute no element takes', () => {
		const table = new CoverageTable([
			{ element: '*', attribute: 'slash', status: 'drawn', note: '' },
		]);
		expect(() => table.sync(SCHEMA)).toThrow('*@slash is not in');
	});

	it('throws on a row given twice', () => {
		const row = { element: 'accent', status: 'drawn', note: '' } as const;
		expect(() => new CoverageTable([row, row]).sync(SCHEMA)).toThrow(
			'more than one row',
		);
	});

	it('reads back what it renders', () => {
		const table = new CoverageTable([
			{ element: 'accent', status: 'drawn', note: '`a.musicxml`: above' },
			{ element: 'fermata', attribute: 'type', status: 'missing', note: '' },
		]);
		expect(CoverageTable.parse(table.render()).rows).toEqual(table.rows);
	});

	it('throws on an unknown status', () => {
		const markdown = new CoverageTable([
			{ element: 'accent', status: 'drawn', note: '' },
		])
			.render()
			.replace('| drawn |', '| drawnish |');
		expect(() => CoverageTable.parse(markdown)).toThrow('unknown status');
	});

	it('tallies the share drawn of the elements not ignored', () => {
		const summary = new CoverageTable([
			{ element: 'accent', status: 'drawn', note: '' },
			{ element: 'fermata', status: 'missing', note: '' },
			{ element: 'midi-instrument', status: 'ignored', note: '' },
		])
			.summary()
			.join('\n');
		expect(summary).toContain('vexml draws 1 of the 2 that show');
	});

	it('passes a drawn row whose fixtures use it', () => {
		const table = new CoverageTable([
			{
				element: 'fermata',
				attribute: 'type',
				status: 'drawn',
				note: '`a.musicxml`, `b.musicxml`: both shapes',
			},
		]);
		const fixtures = new Map([
			['a.musicxml', '<fermata type="upright">normal</fermata>'],
			['b.musicxml', '<fermata default-y="4" type="inverted"/>'],
		]);
		expect(table.problems(fixtures)).toEqual([]);
	});

	it('flags a drawn row with no fixture', () => {
		const table = new CoverageTable([
			{ element: 'accent', status: 'drawn', note: 'trust me' },
		]);
		expect(table.problems(new Map())).toEqual([
			'accent is drawn but names no fixture',
		]);
	});

	it('flags a fixture that does not exist', () => {
		const table = new CoverageTable([
			{ element: 'accent', status: 'drawn', note: '`gone.musicxml`' },
		]);
		expect(table.problems(new Map())).toEqual([
			'accent names gone.musicxml, which does not exist',
		]);
	});

	it('flags a fixture without the element, a longer name aside', () => {
		const table = new CoverageTable([
			{ element: 'accent', status: 'drawn', note: '`a.musicxml`' },
		]);
		const fixtures = new Map([
			['a.musicxml', '<accidental>sharp</accidental>'],
		]);
		expect(table.problems(fixtures)).toEqual([
			'accent names a.musicxml, which does not use it',
		]);
	});

	it('flags a fixture with the element but not the attribute', () => {
		const table = new CoverageTable([
			{
				element: 'fermata',
				attribute: 'type',
				status: 'drawn',
				note: '`a.musicxml`',
			},
		]);
		const fixtures = new Map([['a.musicxml', '<fermata subtype="x"/>']]);
		expect(table.problems(fixtures)).toEqual([
			'fermata@type names a.musicxml, which does not use it',
		]);
	});
});
