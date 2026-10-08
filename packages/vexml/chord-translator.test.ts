import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { MDOMParser, type Measure, type Note } from '@stringsync/mdom';
import { Stave, StaveNote, Stem } from 'vexflow/core';
import { BarlineTranslator } from './barline-translator';
import { ChordTranslator } from './chord-translator';
import { DurationTranslator } from './duration-translator';
import { DynamicGlyphs } from './dynamic-glyphs';
import { NotationTranslator } from './notation-translator';
import { ScoreReader } from './score-reader';
import { SpannerBuilder } from './spanner-builder';
import { TabVoiceTranslator } from './tab-voice-translator';
import { VoiceBuilder } from './voice-builder';
import { VoiceTranslator } from './voice-translator';

describe('ChordTranslator', () => {
	const original = StaveNote.prototype.buildNoteHeads;
	let builds: Map<StaveNote, number>;
	let measure: Measure;
	let builder: VoiceBuilder;
	let byLead: Map<Note, StaveNote>;

	beforeEach(() => {
		builds = new Map();
		StaveNote.prototype.buildNoteHeads = function (this: StaveNote) {
			builds.set(this, (builds.get(this) ?? 0) + 1);
			return original.call(this);
		};
		measure = parse(XML);
		({ builder, byLead } = makeBuilder());
	});

	afterEach(() => {
		StaveNote.prototype.buildNoteHeads = original;
	});

	it('builds each note’s heads only in vexflow’s constructor, beamed or not', () => {
		const reader = new ScoreReader(new DynamicGlyphs());
		builder.planStems(measure, ['1', '2']);
		const pending = ['1', '2'].map((staff, row) =>
			builder.buildNotes(
				new Stave(0, 0, 400),
				row,
				reader.staffVoices(measure, staff),
				staff === '1' ? 'treble' : 'bass',
				{},
			),
		);
		builder.buildPartBeams(pending);

		expect(pending.flatMap((p) => p.beams)).toHaveLength(5);
		// The constructor's own two: its setStemDirection (or autoStem) and its reset.
		expect([...builds.values()].filter((count) => count > 2)).toEqual([]);
		expect(builds.size).toBe(byLead.size);
		// The beams still point where vexflow's auto-stemming would: the high group down, and
		// the slash head survived it.
		const slash = [...byLead.values()][1];
		expect(slash?.getStemDirection()).toBe(Stem.DOWN);
		expect(slash?.noteHeads[0]?.getText()).toBe('\uE100');
	});
});

// One measure of a two-stave part, no dots (vexflow builds a dot off a DOM font parser), every way a stem gets its direction: an auto-stemmed beam
// group (with a slash head and a rest in it), a group with written stems, two voices sharing
// the bottom stave, and a group crossing from the top stave down to the bottom one.
const XML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      ${note('A', 5, 1, 1, 'begin')}
      ${note('F', 5, 1, 1, 'continue', '<notehead>slash</notehead>')}
      <note><rest/><duration>1</duration><voice>1</voice><type>eighth</type><staff>1</staff><beam number="1">continue</beam></note>
      ${note('G', 5, 1, 1, 'end')}
      ${note('C', 5, 1, 1, 'begin', '', 'up')}
      ${note('D', 5, 1, 1, 'end', '', 'up')}
      ${note('E', 4, 1, 1, 'begin')}
      ${note('C', 3, 1, 2, 'end')}
      <backup><duration>8</duration></backup>
      ${note('G', 3, 2, 2, 'begin')}
      ${note('A', 3, 2, 2, 'end')}
      <note><rest/><duration>2</duration><voice>2</voice><type>quarter</type><staff>2</staff></note>
      <note><rest/><duration>4</duration><voice>2</voice><type>half</type><staff>2</staff></note>
      <backup><duration>8</duration></backup>
      ${note('C', 2, 3, 2, 'begin')}
      ${note('D', 2, 3, 2, 'end')}
      <note><rest/><duration>2</duration><voice>3</voice><type>quarter</type><staff>2</staff></note>
      <note><rest/><duration>4</duration><voice>3</voice><type>half</type><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`;

function note(
	step: string,
	octave: number,
	voice: number,
	staff: number,
	beam: string,
	extra = '',
	stem = '',
): string {
	return `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>1</duration><voice>${voice}</voice><type>eighth</type>${stem ? `<stem>${stem}</stem>` : ''}${extra}<staff>${staff}</staff><beam number="1">${beam}</beam></note>`;
}

function parse(xml: string): Measure {
	const measure = new MDOMParser().parseFromString(xml).score.parts[0]
		?.measures[0];
	if (!measure) {
		throw new Error('missing measure');
	}
	return measure;
}

function makeBuilder() {
	const reader = new ScoreReader(new DynamicGlyphs());
	const durations = new DurationTranslator(reader);
	const translator = new VoiceTranslator(
		new ChordTranslator(durations, new NotationTranslator()),
		durations,
		new BarlineTranslator(),
		reader,
	);
	const byLead = new Map<Note, StaveNote>();
	const builder = new VoiceBuilder(
		translator,
		new TabVoiceTranslator(durations, 'none'),
		reader,
		new SpannerBuilder(),
		{
			softmaxFactor: 100,
			octaveShiftByNote: new Map(),
			byLead,
			byTabLead: new Map(),
		},
	);
	return { builder, byLead };
}
