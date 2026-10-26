import { describe, expect, it } from 'bun:test';
import { Volta } from 'vexflow/core';
import { BarlineTranslator, NO_DECORATION } from './barline-translator';
import { type MeasureRepeat, NO_BARLINE_GEOMETRY } from './score-reader';

describe('BarlineTranslator', () => {
	const translator = new BarlineTranslator();

	// The repeat rows a ScoreReader would have read, canned: decorations only translates
	// them, so nothing here needs a parsed score.
	const decorations = (repeats: Partial<MeasureRepeat>[]) =>
		translator.decorations(
			repeats.map((repeat) => ({
				repeatBegin: false,
				repeatEnd: false,
				repeatTimes: null,
				ending: null,
				geometry: NO_BARLINE_GEOMETRY,
				...repeat,
			})),
		);

	it('maps a plain measure to no decoration', () => {
		expect(decorations([{}])).toEqual([NO_DECORATION]);
	});

	it('carries repeat edges through and labels three or more passes', () => {
		expect(
			decorations([{ repeatBegin: true }, { repeatEnd: true, repeatTimes: 4 }]),
		).toEqual([
			{ ...NO_DECORATION, repeatBegin: true },
			{ ...NO_DECORATION, repeatEnd: true, repeatTimesLabel: '4x' },
		]);
	});

	it('leaves a two-pass repeat to its dots alone', () => {
		expect(decorations([{ repeatEnd: true, repeatTimes: 2 }])).toEqual([
			{ ...NO_DECORATION, repeatEnd: true },
		]);
	});

	it('brackets an ending run as BEGIN, MID, END', () => {
		const [first, mid, last] = decorations([
			{
				ending: {
					number: '1',
					first: true,
					last: false,
					open: false,
					hidden: false,
				},
			},
			{
				ending: {
					number: '1',
					first: false,
					last: false,
					open: false,
					hidden: false,
				},
			},
			{
				ending: {
					number: '1',
					first: false,
					last: true,
					open: false,
					hidden: false,
				},
			},
		]);
		expect(first?.volta?.type).toBe(Volta.type.BEGIN);
		expect(mid?.volta?.type).toBe(Volta.type.MID);
		expect(last?.volta?.type).toBe(Volta.type.END);
	});

	it('closes a one-measure ending with both hooks', () => {
		expect(
			decorations([
				{
					ending: {
						number: '2',
						first: true,
						last: true,
						open: false,
						hidden: false,
					},
				},
			])[0]?.volta?.type,
		).toBe(Volta.type.BEGIN_END);
	});

	it('keeps a discontinued ending hookless on the right', () => {
		expect(
			decorations([
				{
					ending: {
						number: '2',
						first: false,
						last: true,
						open: true,
						hidden: false,
					},
				},
			])[0]?.volta?.type,
		).toBe(Volta.type.MID);
	});

	it('prints an ending number list with dots after each pass', () => {
		expect(
			decorations([
				{
					ending: {
						number: '1,2',
						first: true,
						last: true,
						open: false,
						hidden: false,
					},
				},
			])[0]?.volta?.label,
		).toBe('1. 2.');
	});

	it('carries the jogs, label offset and wings through', () => {
		const [decoration] = decorations([
			{
				repeatEnd: true,
				geometry: {
					beginWinged: 'none',
					endWinged: 'curved',
					startJog: 30,
					endJog: 20,
					textX: 8,
				},
				ending: {
					number: '1',
					first: true,
					last: true,
					open: false,
					hidden: false,
				},
			},
		]);
		expect(decoration?.endWinged).toBe('curved');
		expect(decoration?.volta).toEqual({
			type: Volta.type.BEGIN_END,
			label: '1.',
			startJog: 30,
			endJog: 20,
			textX: 8,
		});
	});
});
