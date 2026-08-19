import { describe, expect, it } from 'bun:test';
import type { Key, Time } from '@stringsync/mdom';
import { SignatureTranslator } from './signature-translator';

describe('SignatureTranslator', () => {
	const translator = new SignatureTranslator();

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
