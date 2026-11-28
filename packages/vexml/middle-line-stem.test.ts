import { describe, expect, it } from 'bun:test';
import { MDOMParser, type Measure } from '@stringsync/mdom';
import { Stave, type StaveNote, Stem } from 'vexflow/core';
import { BarlineTranslator } from './barline-translator';
import { ChordTranslator } from './chord-translator';
import { DurationTranslator } from './duration-translator';
import { DynamicGlyphs } from './dynamic-glyphs';
import {
	type MeterGrouping,
	resolveMiddleLineStems,
	type StemDirection,
	type StemEntry,
} from './middle-line-stem';
import { NotationTranslator } from './notation-translator';
import { ScoreReader } from './score-reader';
import { SpannerBuilder } from './spanner-builder';
import { TabVoiceTranslator } from './tab-voice-translator';
import { VoiceBuilder } from './voice-builder';
import { VoiceTranslator } from './voice-translator';

const FOUR_FOUR: MeterGrouping = { beat: 1, bar: 4 };
const THREE_FOUR: MeterGrouping = { beat: 1, bar: 3 };
const TWELVE_EIGHT: MeterGrouping = { beat: 1.5, bar: 6 };

function entry(
	key: string,
	onset: number,
	direction?: StemDirection,
): StemEntry<string> {
	return { key, onset, direction, onMiddleLine: direction === undefined };
}

describe('resolveMiddleLineStems', () => {
	it('follows agreeing neighbours on both sides', () => {
		const up = resolveMiddleLineStems(
			[
				entry('a', 0, 'up'),
				entry('b', 1, 'up'),
				entry('mid', 2),
				entry('c', 3, 'up'),
			],
			FOUR_FOUR,
		);
		expect(up.get('mid')).toBe('up');

		const down = resolveMiddleLineStems(
			[entry('a', 0, 'down'), entry('mid', 1), entry('b', 2, 'down')],
			FOUR_FOUR,
		);
		expect(down.get('mid')).toBe('down');
	});

	it('follows the lone neighbour when only one side has a non-middle-line note', () => {
		const rightOnly = resolveMiddleLineStems(
			[entry('mid', 0), entry('a', 1, 'up'), entry('b', 2, 'up')],
			FOUR_FOUR,
		);
		expect(rightOnly.get('mid')).toBe('up');

		const leftOnly = resolveMiddleLineStems(
			[entry('a', 0, 'up'), entry('mid1', 1), entry('mid2', 2)],
			FOUR_FOUR,
		);
		expect(leftOnly.get('mid1')).toBe('up');
		expect(leftOnly.get('mid2')).toBe('up');
	});

	it('follows the beat when neighbours disagree and the beat agrees', () => {
		const result = resolveMiddleLineStems(
			[
				entry('a', 0, 'up'),
				entry('mid', 0.5),
				entry('b', 1, 'down'),
				entry('c', 2, 'down'),
			],
			FOUR_FOUR,
		);
		expect(result.get('mid')).toBe('up');
	});

	it('follows the half-bar when neighbours disagree and the beat is empty', () => {
		const result = resolveMiddleLineStems(
			[
				entry('a', 0, 'up'),
				entry('mid', 1),
				entry('b', 2, 'down'),
				entry('c', 3, 'down'),
			],
			FOUR_FOUR,
		);
		expect(result.get('mid')).toBe('up');

		// Two middle-line notes across the middle of 4/4 each side with their own half-bar.
		const split = resolveMiddleLineStems(
			[
				entry('a', 0, 'up'),
				entry('mid1', 1),
				entry('mid2', 2),
				entry('b', 3, 'down'),
			],
			FOUR_FOUR,
		);
		expect(split.get('mid1')).toBe('up');
		expect(split.get('mid2')).toBe('down');

		// 12/8 has 4 dotted-quarter beats (half-bar = 3).
		const compound = resolveMiddleLineStems(
			[
				entry('a', 0, 'up'),
				entry('mid', 1.5),
				entry('b', 3, 'down'),
				entry('c', 4.5, 'down'),
			],
			TWELVE_EIGHT,
		);
		expect(compound.get('mid')).toBe('up');
	});

	it('falls back to down when isolated, in triple meter with conflicting neighbours, or in a mixed half-bar', () => {
		const isolated = resolveMiddleLineStems(
			[entry('m1', 0), entry('m2', 1), entry('m3', 2), entry('m4', 3)],
			FOUR_FOUR,
		);
		expect([...isolated.values()]).toEqual(['down', 'down', 'down', 'down']);

		const triple = resolveMiddleLineStems(
			[entry('a', 0, 'up'), entry('mid', 1), entry('b', 2, 'down')],
			THREE_FOUR,
		);
		expect(triple.get('mid')).toBe('down');

		const mixedHalf = resolveMiddleLineStems(
			[
				entry('a', 0, 'up'),
				entry('b', 0.5, 'down'),
				entry('mid', 1),
				entry('c', 2, 'up'),
			],
			FOUR_FOUR,
		);
		expect(mixedHalf.get('mid')).toBe('down');
	});
});

describe('VoiceTranslator middle-line stems', () => {
	it('stems middle-line notes by context while keeping explicit stems and multi-voice defaults', () => {
		const xml = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><stem>down</stem></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>half</type></note>
    </measure>
  </part>
</score-partwise>`;
		const score = new MDOMParser().parseFromString(xml).score;
		const measures = score.parts[0]?.measures ?? [];
		expect(stemDirs(measures[0])).toEqual(['up', 'up', 'down', 'down']);
		// Explicit <stem>down on B4 wins over its up-stemmed neighbours.
		expect(stemDirs(measures[1])).toEqual(['up', 'down', 'up']);
	});
});

function stemDirs(measure: Measure | undefined): StemDirection[] {
	if (!measure) {
		throw new Error('missing measure');
	}
	const reader = new ScoreReader(new DynamicGlyphs());
	const durations = new DurationTranslator(reader);
	const translator = new VoiceTranslator(
		new ChordTranslator(durations, new NotationTranslator(reader), reader),
		durations,
		new BarlineTranslator(),
		reader,
	);
	const byLead = new Map();
	const builder = new VoiceBuilder(
		translator,
		new TabVoiceTranslator(durations, reader, 'none'),
		reader,
		new SpannerBuilder(reader),
		{
			softmaxFactor: 100,
			octaveShiftByNote: new Map(),
			byLead,
			byTabLead: new Map(),
		},
	);
	const pending = builder.buildNotes(
		new Stave(0, 0, 400),
		0,
		reader.staffVoices(measure, '1'),
		'treble',
		{},
	);
	return pending.staveNotes.map((n: StaveNote) =>
		n.getStemDirection() === Stem.UP ? 'up' : 'down',
	);
}
