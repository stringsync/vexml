import { describe, expect, it } from 'bun:test';
import { Volta } from 'vexflow';
import { BarlineTranslator, NO_DECORATION } from './barline-translator';
import type { MeasureRepeat } from './score-reader';

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
			{ ending: { number: '1', first: true, last: false, open: false } },
			{ ending: { number: '1', first: false, last: false, open: false } },
			{ ending: { number: '1', first: false, last: true, open: false } },
		]);
		expect(first?.volta).toEqual({ type: Volta.type.BEGIN, label: '1.' });
		expect(mid?.volta).toEqual({ type: Volta.type.MID, label: '1.' });
		expect(last?.volta).toEqual({ type: Volta.type.END, label: '1.' });
	});

	it('closes a one-measure ending with both hooks', () => {
		expect(
			decorations([
				{ ending: { number: '2', first: true, last: true, open: false } },
			])[0]?.volta,
		).toEqual({ type: Volta.type.BEGIN_END, label: '2.' });
	});

	it('keeps a discontinued ending hookless on the right', () => {
		expect(
			decorations([
				{ ending: { number: '2', first: false, last: true, open: true } },
			])[0]?.volta,
		).toEqual({ type: Volta.type.MID, label: '2.' });
	});

	it('prints an ending number list with dots after each pass', () => {
		expect(
			decorations([
				{ ending: { number: '1,2', first: true, last: true, open: false } },
			])[0]?.volta?.label,
		).toBe('1. 2.');
	});
});
