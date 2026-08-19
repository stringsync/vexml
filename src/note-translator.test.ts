import { describe, expect, it } from 'bun:test';
import type { Key, Time } from '@stringsync/mdom';
import { Volta } from 'vexflow';
import { NO_DECORATION, NoteTranslator } from './note-translator';
import type { MeasureRepeat } from './score-reader';

describe('NoteTranslator', () => {
	const translator = new NoteTranslator();

	const key = (overrides: Partial<Key> = {}) =>
		({
			mode: null,
			rootNote: null,
			alterations: [],
			...overrides,
		}) as unknown as Key;

	const time = (overrides: Partial<Time> = {}) =>
		({
			symbol: null,
			beats: null,
			beatType: null,
			...overrides,
		}) as unknown as Time;

	// The repeat rows a ScoreReader would have read, canned: barlineDecorations only
	// translates them, so nothing here needs a parsed score.
	const decorations = (repeats: Partial<MeasureRepeat>[]) =>
		translator.barlineDecorations(
			repeats.map((repeat) => ({
				repeatBegin: false,
				repeatEnd: false,
				repeatTimes: null,
				ending: null,
				...repeat,
			})),
		);

	it('keys a major signature by its bare tonic', () => {
		expect(
			translator.vexflowKeySpec(key({ mode: 'major', rootNote: 'Eb' })),
		).toBe('Eb');
	});

	it('suffixes a minor signature with m', () => {
		expect(
			translator.vexflowKeySpec(key({ mode: 'minor', rootNote: 'G#' })),
		).toBe('G#m');
	});

	it('spells the common and cut symbols as C and C|', () => {
		expect(translator.timeSignatureSpec(time({ symbol: 'common' }))).toBe('C');
		expect(translator.timeSignatureSpec(time({ symbol: 'cut' }))).toBe('C|');
	});

	it('prints a single-number meter as its beat count alone', () => {
		expect(
			translator.timeSignatureSpec(
				time({ symbol: 'single-number', beats: '3' }),
			),
		).toBe('3');
	});

	it('joins beats and beat type into a fraction spec', () => {
		expect(
			translator.timeSignatureSpec(time({ beats: '6', beatType: '8' })),
		).toBe('6/8');
	});

	it('has no spec for a missing or empty time', () => {
		expect(translator.timeSignatureSpec(null)).toBeNull();
		expect(translator.timeSignatureSpec(time())).toBeNull();
		expect(translator.timeSignatureSpec(time({ beats: '6' }))).toBeNull();
	});

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

	it('has no custom accidentals for a traditional fifths key', () => {
		expect(
			translator.customKeyAccidentals(key({ rootNote: 'D' }), 'treble'),
		).toEqual([]);
	});

	it('places a pinned custom accidental at its named octave', () => {
		// F5 sits on the treble top line — signature line 0, the traditional F# spot.
		expect(
			translator.customKeyAccidentals(
				key({
					alterations: [{ step: 'F', alter: 1, accidental: null, octave: 5 }],
				}),
				'treble',
			),
		).toEqual([{ type: '#', line: 0 }]);
	});

	it('floats an unpinned accidental to the highest on-stave position', () => {
		// The traditional spots fall out of the rule: treble F# on the top line,
		// treble Bb on the middle line.
		expect(
			translator.customKeyAccidentals(
				key({
					alterations: [
						{ step: 'F', alter: 1, accidental: null, octave: null },
						{ step: 'B', alter: -1, accidental: null, octave: null },
					],
				}),
				'treble',
			),
		).toEqual([
			{ type: '#', line: 0 },
			{ type: 'b', line: 2 },
		]);
	});

	it('reads the line against the clef it will print on', () => {
		// Bass F# engraves on the fourth line (F3), one line under the treble spot.
		expect(
			translator.customKeyAccidentals(
				key({
					alterations: [
						{ step: 'F', alter: 1, accidental: null, octave: null },
					],
				}),
				'bass',
			),
		).toEqual([{ type: '#', line: 1 }]);
	});

	it('lets a named key-accidental outrank the alter fallback', () => {
		expect(
			translator.customKeyAccidentals(
				key({
					alterations: [
						{ step: 'B', alter: -1, accidental: 'quarter-flat', octave: null },
					],
				}),
				'treble',
			),
		).toEqual([{ type: 'd', line: 2 }]);
	});

	it('spells alter semitones through the fallback table', () => {
		const lines = translator.customKeyAccidentals(
			key({
				alterations: [
					{ step: 'B', alter: -2, accidental: null, octave: null },
					{ step: 'B', alter: 0, accidental: null, octave: null },
					{ step: 'B', alter: 2, accidental: null, octave: null },
				],
			}),
			'treble',
		);
		expect(lines.map((a) => a.type)).toEqual(['bb', 'n', '##']);
	});

	it('drops an alteration it cannot spell', () => {
		// A microtonal alter with no named accidental has no glyph to print.
		expect(
			translator.customKeyAccidentals(
				key({
					alterations: [
						{ step: 'B', alter: 0.5, accidental: null, octave: null },
					],
				}),
				'treble',
			),
		).toEqual([]);
	});
});
