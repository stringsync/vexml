import { describe, expect, it } from 'bun:test';
import { MDOMParser } from '@stringsync/mdom';
import { DynamicGlyphs } from './dynamic-glyphs';
import { ScoreReader } from './score-reader';

// The last measure of the Vienna Etude Op. 10 No. 3 seed (MuseScore: "backup beyond measure start").
// Voice 4 holds a chord note written after a <backup>, so the <backup> after it rewinds past
// the measure's start, and mdom places voice 5's note at beat -1. The file is malformed, but
// the intent is plain (voice 5 starts with the others), and vexml draws it there: nothing is
// dropped. This pins that decision.
const XML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>16</divisions><time><beats>2</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
      <backup><duration>16</duration></backup>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>16</duration><voice>3</voice><type>quarter</type><staff>2</staff></note>
      <backup><duration>16</duration></backup>
      <note><pitch><step>E</step><octave>3</octave></pitch><duration>16</duration><voice>4</voice><type>quarter</type><staff>2</staff></note>
      <backup><duration>16</duration></backup>
      <note><chord/><pitch><step>B</step><octave>2</octave></pitch><duration>16</duration><voice>4</voice><type>quarter</type><staff>2</staff></note>
      <backup><duration>16</duration></backup>
      <note><pitch><step>E</step><octave>2</octave></pitch><duration>16</duration><voice>5</voice><type>quarter</type><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`;

describe('a <backup> past the measure start', () => {
	it('keeps every voice, voice 5 included', () => {
		const measure = new MDOMParser()
			.parseFromString(XML)
			.score.getPart('P1')
			?.getMeasure('1');
		expect(measure).toBeDefined();
		const reader = new ScoreReader(new DynamicGlyphs());

		const bass = reader
			.staffVoices(measure as NonNullable<typeof measure>, '2')
			.flatMap((voice) => voice.chords)
			.flatMap((chord) => chord.notes)
			.map((note) => `${note.pitch?.step}${note.pitch?.octave}`)
			.sort();

		expect(bass).toEqual(['B2', 'E2', 'E3', 'G3']);
	});
});
