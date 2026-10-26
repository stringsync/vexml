import { describe, expect, it } from 'bun:test';
import type { Clef, Key, Time } from '@stringsync/mdom';
import { Appearance } from './appearance';
import { SignatureTranslator } from './signature-translator';

describe('SignatureTranslator', () => {
	const translator = new SignatureTranslator();

	const key = (overrides: Partial<Key> = {}) =>
		({
			mode: null,
			rootNote: null,
			alterations: [],
			child: () => null,
			...overrides,
		}) as unknown as Key;

	const clef = (
		sign: string,
		line: number,
		attributes: Record<string, string> = {},
	) =>
		({
			sign,
			line,
			octaveChange: 0,
			getAttribute: (name: string) => attributes[name] ?? null,
		}) as unknown as Clef;

	const time = (overrides: Partial<Time> = {}) =>
		({
			symbol: null,
			beats: null,
			beatType: null,
			child: () => null,
			getAttribute: () => null,
			...overrides,
		}) as unknown as Time;

	const node = (text: string | null, attributes: Record<string, string> = {}) =>
		({
			text,
			getAttribute: (name: string) => attributes[name] ?? null,
			child: () => null,
		}) as unknown;

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
		// F5 sits on the treble top line (signature line 0, the traditional F# spot).
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

	it('leaves a plain meter to vexflow', () => {
		expect(
			translator.extendedTimeSpec(time({ beats: '3', beatType: '4' })),
		).toBeNull();
	});

	it('prints the beat-type as a note for symbol=note', () => {
		expect(
			translator.extendedTimeSpec(
				time({ symbol: 'note', beats: '3', beatType: '4' }),
			),
		).toEqual({
			separator: null,
			faces: [{ beats: '3', beatType: '4', note: 'note' }],
			interchange: null,
		});
	});

	it('reads a dotted-note compound meter as its dotted beat', () => {
		expect(
			translator.extendedTimeSpec(
				time({ symbol: 'dotted-note', beats: '6', beatType: '8' }),
			)?.faces,
		).toEqual([{ beats: '2', beatType: '4', note: 'dotted-note' }]);
	});

	it('falls back to the plain note when the beats do not group in threes', () => {
		expect(
			translator.extendedTimeSpec(
				time({ symbol: 'dotted-note', beats: '4', beatType: '4' }),
			)?.faces,
		).toEqual([{ beats: '4', beatType: '4', note: 'note' }]);
	});

	it('keeps every beats/beat-type pair of a composite meter', () => {
		expect(
			translator.extendedTimeSpec(
				time({
					beats: '2',
					beatType: '4',
					components: [
						{ beats: '2', beatType: '4' },
						{ beats: '3', beatType: '8' },
					],
				} as Partial<Time>),
			)?.faces,
		).toEqual([
			{ beats: '2', beatType: '4', note: null },
			{ beats: '3', beatType: '8', note: null },
		]);
	});

	it('reads an interchangeable meter and its relation', () => {
		const parts: Record<string, unknown> = {
			interchangeable: {
				getAttribute: () => null,
				child: (tag: string) =>
					({
						beats: node('6'),
						'beat-type': node('8'),
						'time-relation': node('equals'),
					})[tag] ?? null,
			},
		};
		expect(
			translator.extendedTimeSpec(
				time({
					beats: '3',
					beatType: '4',
					child: (tag: string) => parts[tag] ?? null,
				} as Partial<Time>),
			),
		).toEqual({
			separator: null,
			faces: [{ beats: '3', beatType: '4', note: null }],
			interchange: {
				relation: 'equals',
				face: { beats: '6', beatType: '8', note: null },
			},
		});
	});

	it('sets the numbers by a time separator', () => {
		expect(
			translator.extendedTimeSpec(
				time({
					beats: '3',
					beatType: '4',
					getAttribute: (name: string) =>
						name === 'separator' ? 'diagonal' : null,
				} as Partial<Time>),
			),
		).toEqual({
			separator: 'diagonal',
			faces: [{ beats: '3', beatType: '4', note: null }],
			interchange: null,
		});
	});

	it('leaves a none separator to the plain spec', () => {
		expect(
			translator.extendedTimeSpec(
				time({
					beats: '3',
					beatType: '4',
					getAttribute: (name: string) =>
						name === 'separator' ? 'none' : null,
				} as Partial<Time>),
			),
		).toBeNull();
	});

	it('cancels the key being replaced when the change names no cancel', () => {
		expect(
			translator.keyCancel(
				key({ rootNote: 'F' }),
				key({ mode: 'major', rootNote: 'D' }),
			),
		).toEqual({ spec: 'D', location: 'left' });
	});

	it('cancels the key a cancel names, where it says', () => {
		const cancel = node('-3', { location: 'right' });
		expect(
			translator.keyCancel(
				key({
					rootNote: 'F',
					child: (tag: string) => (tag === 'cancel' ? cancel : null),
				} as Partial<Key>),
				key({ rootNote: 'D' }),
			),
		).toEqual({ spec: 'Eb', location: 'right' });
	});

	it('ignores the line of an additional clef', () => {
		expect(translator.clefName(clef('C', 4))).toBe('tenor');
		expect(translator.clefName(clef('C', 4, { additional: 'yes' }))).toBe(
			'alto',
		);
	});

	it('sizes a clef by its size attribute, else by whether it is a change', () => {
		expect(translator.clefSize(clef('G', 2), false)).toEqual({
			size: 'default',
			scale: 1,
		});
		expect(translator.clefSize(clef('G', 2), true)).toEqual({
			size: 'small',
			scale: 1,
		});
		expect(translator.clefSize(clef('G', 2, { size: 'cue' }), false)).toEqual({
			size: 'small',
			scale: 1,
		});
		expect(translator.clefSize(clef('G', 2, { size: 'full' }), true)).toEqual({
			size: 'default',
			scale: 1,
		});
		expect(translator.clefSize(clef('G', 2, { size: 'large' }), false)).toEqual(
			{
				size: 'default',
				scale: 1.2,
			},
		);
	});

	const glyphs = new SignatureTranslator();
	glyphs.useAppearance(
		new Appearance(
			new Map(),
			new Map(),
			new Map([
				['c-clef', 'cClefSquare'],
				['f-clef', 'fClefReversed'],
				['g-clef-ottava-bassa', 'gClef8vbOld'],
			]),
		),
	);

	it('swaps the glyph of every clef drawn with the one its type names', () => {
		expect(glyphs.clefGlyph('alto', undefined)).toBe('\uE060');
		expect(glyphs.clefGlyph('tenor', undefined)).toBe('\uE060');
		expect(glyphs.clefGlyph('bass', undefined)).toBe('\uE076');
		expect(glyphs.clefGlyph('treble', '8vb')).toBe('\uE055');
	});

	it('keeps the clefs no glyph type names', () => {
		expect(glyphs.clefGlyph('treble', undefined)).toBeNull();
		expect(glyphs.clefGlyph('bass', '8vb')).toBeNull();
		expect(glyphs.clefGlyph('percussion', undefined)).toBeNull();
		expect(translator.clefGlyph('alto', undefined)).toBeNull();
	});
});
