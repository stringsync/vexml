import { describe, expect, it } from 'bun:test';
import type { Note } from '@stringsync/mdom';
import {
	Beam,
	CanvasContext,
	Dot,
	Formatter,
	Stave,
	StaveNote,
	Stem,
	Tuplet,
	Voice,
} from 'vexflow/core';
import { Appearance } from './appearance';
import { QUARTER_NOTE_TICKS } from './constants';
import { DefaultScoreParser } from './default-score-parser';
import { DisplayTuplet } from './display-tuplet';
import { DynamicGlyphs } from './dynamic-glyphs';
import { FakePaintProbe } from './fake-paint-probe';
import { PaintContext } from './paint-context';
import { PaintList } from './paint-list';
import { ProbeTextCanvas } from './probe-text-canvas';
import { ScoreReader } from './score-reader';
import { crossBarlineTupletLeads, TupletBuilder } from './tuplet-builder';

describe('TupletBuilder single-note tuplets', () => {
	it('builds numerals without rescaling ticks for modern single-note tremolo notation', async () => {
		const { reader, chords } = await parseScore(`
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>12</duration>
        <voice>1</voice>
        <type>quarter</type>
        <time-modification>
          <actual-notes>3</actual-notes>
          <normal-notes>2</normal-notes>
          <normal-type>eighth</normal-type>
        </time-modification>
        <notations>
          <tuplet number="1" type="start"/>
          <tuplet number="1" type="stop"/>
          <ornaments><tremolo type="single">1</tremolo></ornaments>
        </notations>
      </note>
      <note>
        <pitch><step>C</step><octave>5</octave></pitch>
        <duration>12</duration>
        <voice>1</voice>
        <type>quarter</type>
        <time-modification>
          <actual-notes>3</actual-notes>
          <normal-notes>2</normal-notes>
          <normal-type>eighth</normal-type>
        </time-modification>
        <notations>
          <tuplet number="1" type="start"/>
          <tuplet number="1" type="stop"/>
          <ornaments><tremolo type="single">1</tremolo></ornaments>
        </notations>
      </note>
    `);
		const [first, second] = chords;
		if (!first || !second) {
			throw new Error('expected two chords');
		}
		const a4 = makeNote('a/4', 'q', Stem.UP);
		const c5 = makeNote('c/5', 'q', Stem.DOWN);
		const byLead = new Map<Note, StaveNote>([
			[first.lead, a4],
			[second.lead, c5],
		]);
		const tuplets = new TupletBuilder(reader, Appearance.NONE).build(
			chords,
			byLead,
		);
		expect(tuplets).toHaveLength(2);
		expect(tuplets[0]?.getNoteCount()).toBe(3);
		expect(tuplets[0]?.getNotes()).toEqual([a4]);
		expect(tuplets[1]?.getNotes()).toEqual([c5]);
		// Written quarter note already lasts 1 full beat (4096 ticks): must not be rescaled to 2/3.
		expect(a4.getTicks().value()).toBe(QUARTER_NOTE_TICKS);
		expect(c5.getTicks().value()).toBe(QUARTER_NOTE_TICKS);
		expect(a4.getTuplet()).toBeUndefined();
		expect(c5.getTuplet()).toBeUndefined();
	});

	it('rescales ticks for traditional dotted-value single-note tremolo tuplets', async () => {
		const { reader, chords } = await parseScore(`
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>12</duration>
        <voice>1</voice>
        <type>quarter</type>
        <dot/>
        <time-modification>
          <actual-notes>3</actual-notes>
          <normal-notes>2</normal-notes>
          <normal-type>eighth</normal-type>
        </time-modification>
        <notations>
          <tuplet number="1" type="start"/>
          <tuplet number="1" type="stop"/>
          <ornaments><tremolo>1</tremolo></ornaments>
        </notations>
      </note>
    `);
		const [first] = chords;
		if (!first) {
			throw new Error('expected one chord');
		}
		const g4 = makeNote('g/4', 'q', Stem.UP, 1);
		const byLead = new Map<Note, StaveNote>([[first.lead, g4]]);
		const tuplets = new TupletBuilder(reader, Appearance.NONE).build(
			chords,
			byLead,
		);
		expect(tuplets).toHaveLength(1);
		expect(tuplets[0]?.getNoteCount()).toBe(3);
		// Dotted quarter (1.5 beats = 6144 ticks) rescaled by 2/3 = 1 beat (4096 ticks).
		expect(g4.getTicks().value()).toBe(QUARTER_NOTE_TICKS);
		expect(g4.getTuplet()).toBe(tuplets[0]);
	});

	it('skips a single-note tuplet with no ratio', async () => {
		const { reader, chords } = await parseScore(`
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>12</duration>
        <voice>1</voice>
        <type>quarter</type>
        <notations>
          <tuplet number="1" type="start"/>
          <tuplet number="1" type="stop"/>
        </notations>
      </note>
    `);
		const [first] = chords;
		if (!first) {
			throw new Error('expected one chord');
		}
		const a4 = makeNote('a/4', 'q', Stem.UP);
		const byLead = new Map<Note, StaveNote>([[first.lead, a4]]);
		const tuplets = new TupletBuilder(reader, Appearance.NONE).build(
			chords,
			byLead,
		);
		expect(tuplets).toHaveLength(0);
	});

	it('renders show-type note-value glyphs at smaller Tuplet.suffix scale without shifting the numeral baseline', async () => {
		const { reader, chords } = await parseScore(`
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>6</duration>
        <voice>1</voice>
        <type>quarter</type>
        <time-modification>
          <actual-notes>4</actual-notes>
          <normal-notes>3</normal-notes>
          <normal-type>eighth</normal-type>
        </time-modification>
        <notations>
          <tuplet number="1" type="start" bracket="yes" show-number="both" show-type="both">
            <tuplet-actual>
              <tuplet-number>4</tuplet-number>
              <tuplet-type>quarter</tuplet-type>
            </tuplet-actual>
            <tuplet-normal>
              <tuplet-number>3</tuplet-number>
              <tuplet-type>eighth</tuplet-type>
            </tuplet-normal>
          </tuplet>
        </notations>
      </note>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>6</duration>
        <voice>1</voice>
        <type>quarter</type>
        <time-modification>
          <actual-notes>4</actual-notes>
          <normal-notes>3</normal-notes>
          <normal-type>eighth</normal-type>
        </time-modification>
        <notations>
          <tuplet number="1" type="stop"/>
        </notations>
      </note>
    `);
		const [first, second] = chords;
		if (!first || !second) {
			throw new Error('expected two chords');
		}
		const a = makeNote('a/4', 'q', Stem.UP);
		const b = makeNote('a/4', 'q', Stem.UP);
		const byLead = new Map<Note, StaveNote>([
			[first.lead, a],
			[second.lead, b],
		]);
		const tuplets = new TupletBuilder(reader, Appearance.NONE).build(
			chords,
			byLead,
		);
		expect(tuplets).toHaveLength(1);
		expect(tuplets[0]?.getNoteCount()).toBe(4);
		expect(tuplets[0]?.getNotesOccupied()).toBe(3);
	});
});

describe('TupletBuilder default placement', () => {
	it('places mixed-stem tuplets by stem-direction majority and defaults above on a tie', async () => {
		const { reader, chords } = await parseScore(`
      <note>
        <pitch><step>D</step><octave>5</octave></pitch>
        <duration>8</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <notations><tuplet number="1" type="start"/></notations>
      </note>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>8</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>8</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <notations><tuplet number="1" type="stop"/></notations>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>8</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <notations><tuplet number="1" type="start"/></notations>
      </note>
      <note>
        <pitch><step>D</step><octave>5</octave></pitch>
        <duration>8</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
      </note>
      <note>
        <pitch><step>C</step><octave>5</octave></pitch>
        <duration>8</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <notations><tuplet number="1" type="stop"/></notations>
      </note>
    `);
		const notes = [
			makeNote('d/5', 'q', Stem.DOWN),
			makeNote('a/4', 'q', Stem.UP),
			makeNote('e/4', 'q', Stem.UP),
			makeNote('e/4', 'q', Stem.UP),
			makeNote('d/5', 'q', Stem.DOWN),
			makeNote('c/5', 'q', Stem.DOWN),
		];
		const byLead = mapByLead(chords, notes);
		const tuplets = new TupletBuilder(reader, Appearance.NONE).build(
			chords,
			byLead,
		);
		expect(tuplets).toHaveLength(2);
		expect(tuplets[0]?.getLocation()).toBe(Tuplet.LOCATION_TOP);
		expect(tuplets[1]?.getLocation()).toBe(Tuplet.LOCATION_BOTTOM);
	});

	it('defaults mixed-stem ties to above and honours explicit placement', async () => {
		const { reader, chords } = await parseScore(`
      <note>
        <pitch><step>D</step><octave>5</octave></pitch>
        <duration>12</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>2</actual-notes><normal-notes>3</normal-notes></time-modification>
        <notations><tuplet number="1" type="start"/></notations>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>12</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>2</actual-notes><normal-notes>3</normal-notes></time-modification>
        <notations><tuplet number="1" type="stop"/></notations>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>12</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>2</actual-notes><normal-notes>3</normal-notes></time-modification>
        <notations><tuplet number="1" type="start" placement="below"/></notations>
      </note>
      <note>
        <pitch><step>F</step><octave>4</octave></pitch>
        <duration>12</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>2</actual-notes><normal-notes>3</normal-notes></time-modification>
        <notations><tuplet number="1" type="stop"/></notations>
      </note>
    `);
		const notes = [
			makeNote('d/5', 'q', Stem.DOWN),
			makeNote('e/4', 'q', Stem.UP),
			makeNote('e/4', 'q', Stem.UP),
			makeNote('f/4', 'q', Stem.UP),
		];
		const byLead = mapByLead(chords, notes);
		const tuplets = new TupletBuilder(reader, Appearance.NONE).build(
			chords,
			byLead,
		);
		expect(tuplets).toHaveLength(2);
		expect(tuplets[0]?.getLocation()).toBe(Tuplet.LOCATION_TOP);
		expect(tuplets[1]?.getLocation()).toBe(Tuplet.LOCATION_BOTTOM);
	});

	it('brackets a tuplet that is only part of a longer beam unless bracket="no" is explicit', async () => {
		const { reader, chords } = await parseScore(`
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>16th</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <beam number="1">begin</beam><beam number="2">begin</beam>
        <notations><tuplet number="1" type="start"/></notations>
      </note>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>16th</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <beam number="1">continue</beam><beam number="2">continue</beam>
      </note>
      <note>
        <pitch><step>B</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>16th</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <beam number="1">continue</beam><beam number="2">end</beam>
        <notations><tuplet number="1" type="stop"/></notations>
      </note>
      <note>
        <pitch><step>C</step><octave>5</octave></pitch>
        <duration>6</duration><voice>1</voice><type>eighth</type>
        <beam number="1">end</beam>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>16th</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <beam number="1">begin</beam><beam number="2">begin</beam>
        <notations><tuplet number="1" type="start" bracket="no"/></notations>
      </note>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>16th</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <beam number="1">continue</beam><beam number="2">continue</beam>
      </note>
      <note>
        <pitch><step>B</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>16th</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <beam number="1">continue</beam><beam number="2">end</beam>
        <notations><tuplet number="1" type="stop"/></notations>
      </note>
      <note>
        <pitch><step>C</step><octave>5</octave></pitch>
        <duration>6</duration><voice>1</voice><type>eighth</type>
        <beam number="1">end</beam>
      </note>
      <note>
        <pitch><step>C</step><octave>5</octave></pitch>
        <duration>4</duration><voice>1</voice><type>eighth</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <beam number="1">begin</beam>
        <notations><tuplet number="1" type="start"/></notations>
      </note>
      <note>
        <pitch><step>D</step><octave>5</octave></pitch>
        <duration>4</duration><voice>1</voice><type>eighth</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <beam number="1">continue</beam>
      </note>
      <note>
        <pitch><step>E</step><octave>5</octave></pitch>
        <duration>4</duration><voice>1</voice><type>eighth</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <beam number="1">end</beam>
        <notations><tuplet number="1" type="stop"/></notations>
      </note>
    `);
		const notes = [
			makeNote('g/4', '16', Stem.UP),
			makeNote('a/4', '16', Stem.UP),
			makeNote('b/4', '16', Stem.UP),
			makeNote('c/5', '8', Stem.UP),
			makeNote('g/4', '16', Stem.UP),
			makeNote('a/4', '16', Stem.UP),
			makeNote('b/4', '16', Stem.UP),
			makeNote('c/5', '8', Stem.UP),
			makeNote('c/5', '8', Stem.DOWN),
			makeNote('d/5', '8', Stem.DOWN),
			makeNote('e/5', '8', Stem.DOWN),
		];
		new Beam(notes.slice(0, 4));
		new Beam(notes.slice(4, 8));
		new Beam(notes.slice(8, 11));
		const byLead = mapByLead(chords, notes);
		const tuplets = new TupletBuilder(reader, Appearance.NONE).build(
			chords,
			byLead,
		);
		expect(tuplets).toHaveLength(3);
		expect(tuplets[0]?.isBracketed()).toBe(true);
		expect(tuplets[1]?.isBracketed()).toBe(false);
		expect(tuplets[2]?.isBracketed()).toBe(false);
	});

	it('brackets outer nested tuplets and places inner levels on the opposite side with brackets by default', async () => {
		const { reader, chords } = await parseScore(`
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>16th</type>
        <time-modification><actual-notes>9</actual-notes><normal-notes>4</normal-notes></time-modification>
        <notations>
          <tuplet number="1" type="start"><tuplet-actual><tuplet-number>3</tuplet-number></tuplet-actual></tuplet>
          <tuplet number="2" type="start"><tuplet-actual><tuplet-number>3</tuplet-number></tuplet-actual></tuplet>
        </notations>
      </note>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>16th</type>
        <time-modification><actual-notes>9</actual-notes><normal-notes>4</normal-notes></time-modification>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>16th</type>
        <time-modification><actual-notes>9</actual-notes><normal-notes>4</normal-notes></time-modification>
        <notations><tuplet number="2" type="stop"/></notations>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>16th</type>
        <time-modification><actual-notes>9</actual-notes><normal-notes>4</normal-notes></time-modification>
        <notations>
          <tuplet number="2" type="start"><tuplet-actual><tuplet-number>3</tuplet-number></tuplet-actual></tuplet>
        </notations>
      </note>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>16th</type>
        <time-modification><actual-notes>9</actual-notes><normal-notes>4</normal-notes></time-modification>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>16th</type>
        <time-modification><actual-notes>9</actual-notes><normal-notes>4</normal-notes></time-modification>
        <notations>
          <tuplet number="2" type="stop"/>
          <tuplet number="1" type="stop"/>
        </notations>
      </note>
    `);
		const notes = chords.map(() => makeNote('g/4', '16', Stem.UP));
		new Beam(notes);
		const byLead = mapByLead(chords, notes);
		const tuplets = new TupletBuilder(reader, Appearance.NONE).build(
			chords,
			byLead,
		);
		expect(tuplets).toHaveLength(3);
		const [inner1, inner2, outer] = tuplets;
		// Outer on stem side (above), inner on notehead side (below).
		expect(outer?.getLocation()).toBe(Tuplet.LOCATION_TOP);
		expect(inner1?.getLocation()).toBe(Tuplet.LOCATION_BOTTOM);
		expect(inner2?.getLocation()).toBe(Tuplet.LOCATION_BOTTOM);
		// Both outer and notehead-side inner tuplets are bracketed even though beamed.
		expect(outer?.isBracketed()).toBe(true);
		expect(inner1?.isBracketed()).toBe(true);
		expect(inner2?.isBracketed()).toBe(true);
		// Opposite-side nesting adds no same-side extra yOffset.
		expect(tupletOptions(outer).yOffset).toBe(0);
	});

	it('preserves explicit same-side placement and explicit bracket="no" on nested tuplets', async () => {
		const { reader, chords } = await parseScore(`
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>16th</type>
        <time-modification><actual-notes>9</actual-notes><normal-notes>4</normal-notes></time-modification>
        <notations>
          <tuplet number="1" type="start" placement="above" bracket="no"><tuplet-actual><tuplet-number>3</tuplet-number></tuplet-actual></tuplet>
          <tuplet number="2" type="start" placement="above"><tuplet-actual><tuplet-number>3</tuplet-number></tuplet-actual></tuplet>
        </notations>
      </note>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>16th</type>
        <time-modification><actual-notes>9</actual-notes><normal-notes>4</normal-notes></time-modification>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>2</duration><voice>1</voice><type>16th</type>
        <time-modification><actual-notes>9</actual-notes><normal-notes>4</normal-notes></time-modification>
        <notations>
          <tuplet number="2" type="stop"/>
          <tuplet number="1" type="stop"/>
        </notations>
      </note>
    `);
		const notes = chords.map(() => makeNote('g/4', '16', Stem.UP));
		new Beam(notes);
		const byLead = mapByLead(chords, notes);
		const tuplets = new TupletBuilder(reader, Appearance.NONE).build(
			chords,
			byLead,
		);
		expect(tuplets).toHaveLength(2);
		const [inner, outer] = tuplets;
		expect(inner?.getLocation()).toBe(Tuplet.LOCATION_TOP);
		expect(outer?.getLocation()).toBe(Tuplet.LOCATION_TOP);
		expect(outer?.isBracketed()).toBe(false);
		expect(inner?.isBracketed()).toBe(false);
		expect(tupletOptions(outer).yOffset).toBeLessThan(0);
	});
});

describe('DisplayTuplet beamed bracket slope', () => {
	function renderTuplet(
		notes: StaveNote[],
		beams: Beam[],
		location: number = Tuplet.LOCATION_TOP,
	): DisplayTuplet {
		new ProbeTextCanvas(new FakePaintProbe()).install();
		const stave = new Stave(10, 80, 260);
		const ctx = new CanvasContext(
			new PaintContext(
				new PaintList(),
				new FakePaintProbe(),
				null,
			) as unknown as CanvasRenderingContext2D,
		);
		stave.setContext(ctx).draw();
		const voice = new Voice({ numBeats: 4, beatValue: 4 }).setStrict(false);
		voice.addTickables(notes);
		const tuplet = new DisplayTuplet(notes, {
			location,
			bracketed: true,
			numNotes: notes.length,
			notesOccupied: Math.max(1, notes.length - 1),
		});
		new Formatter().joinVoices([voice]).format([voice], 220);
		voice.draw(ctx, stave);
		for (const beam of beams) {
			beam.setContext(ctx).draw();
		}
		tuplet.setContext(ctx).draw();
		return tuplet;
	}

	it('slopes parallel to a single ascending beam', () => {
		const n1 = makeNote('f/4', '8', Stem.UP);
		const n2 = makeNote('a/4', '8', Stem.UP);
		const rest = new StaveNote({ keys: ['b/4'], duration: '8r' });
		const beam = new Beam([n1, n2]);
		const tuplet = renderTuplet([n1, n2, rest], [beam]);
		const range = tuplet.getBracketYRange();
		expect(range).not.toBeNull();
		expect((range?.bottom ?? 0) - (range?.top ?? 0)).toBeGreaterThan(2);
	});

	it('stays horizontal across opposing beams', () => {
		const n1 = makeNote('g/4', '8', Stem.UP);
		const n2 = makeNote('b/4', '8', Stem.UP);
		const rest = new StaveNote({ keys: ['b/4'], duration: '8r' });
		const n3 = makeNote('b/4', '8', Stem.UP);
		const n4 = makeNote('g/4', '8', Stem.UP);
		const b1 = new Beam([n1, n2]);
		const b2 = new Beam([n3, n4]);
		const tuplet = renderTuplet([n1, n2, rest, n3, n4], [b1, b2]);
		expect(tuplet.getBracketYRange()).toBeNull();
	});

	it('falls back to horizontal when sloping would collide with the stave', () => {
		const n1 = makeNote('c/6', '8', Stem.DOWN);
		const n2 = makeNote('a/5', '8', Stem.DOWN);
		const rest = new StaveNote({ keys: ['b/4'], duration: '8r' });
		const beam = new Beam([n1, n2]);
		const tuplet = renderTuplet([n1, n2, rest], [beam], Tuplet.LOCATION_BOTTOM);
		expect(tuplet.getBracketYRange()).toBeNull();
	});
});

describe('TupletBuilder cross-barline tuplets', () => {
	it('builds one unbroken tuplet spanning across a barline without rescaling ticks', async () => {
		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>P1</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>180</divisions>
        <time><beats>2</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>F</step><octave>4</octave></pitch>
        <duration>120</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>6</actual-notes><normal-notes>4</normal-notes></time-modification>
        <notations><tuplet type="start" bracket="yes"/></notations>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>120</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>6</actual-notes><normal-notes>4</normal-notes></time-modification>
      </note>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>120</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>6</actual-notes><normal-notes>4</normal-notes></time-modification>
      </note>
    </measure>
    <measure number="2">
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>120</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>6</actual-notes><normal-notes>4</normal-notes></time-modification>
      </note>
      <note>
        <pitch><step>F</step><octave>4</octave></pitch>
        <duration>120</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>6</actual-notes><normal-notes>4</normal-notes></time-modification>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch>
        <duration>120</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>6</actual-notes><normal-notes>4</normal-notes></time-modification>
        <notations><tuplet type="stop"/></notations>
      </note>
    </measure>
  </part>
</score-partwise>`;
		const doc = await new DefaultScoreParser().parse(xml);
		const reader = new ScoreReader(new DynamicGlyphs());
		const m1 = doc.score.parts[0]?.measures[0];
		const m2 = doc.score.parts[0]?.measures[1];
		if (!m1 || !m2) {
			throw new Error('expected two measures');
		}
		const allChords = [...m1.chords, ...m2.chords];
		const notes = allChords.map(() => makeNote('g/4', 'q', Stem.UP));
		const byLead = mapByLead(allChords, notes);

		// Per-measure build produces nothing, while crossBarlineTupletLeads finds every note in each half.
		const builder = new TupletBuilder(reader, Appearance.NONE);
		expect(builder.build(m1.chords, byLead)).toHaveLength(0);
		expect(builder.build(m2.chords, byLead)).toHaveLength(0);
		expect(crossBarlineTupletLeads(m1.chords).size).toBe(3);
		expect(crossBarlineTupletLeads(m2.chords).size).toBe(3);

		// Cross-barline build produces one unbroken 6-tuplet spanning all 6 notes without rescaling ticks.
		const cross = builder.buildCrossBarline(allChords, byLead);
		expect(cross).toHaveLength(1);
		expect(cross[0]?.getNoteCount()).toBe(6);
		expect(cross[0]?.getNotesOccupied()).toBe(4);
		expect(cross[0]?.getNotes()).toEqual(notes);
		expect(notes.map((note) => note.getTicks().value())).toEqual(
			notes.map(() => QUARTER_NOTE_TICKS),
		);
	});

	it('skips within-measure tuplets in buildCrossBarline and splits across system breaks', async () => {
		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>P1</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>12</divisions>
        <time><beats>2</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>8</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <notations><tuplet type="start"/></notations>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>8</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>8</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
        <notations><tuplet type="stop"/></notations>
      </note>
    </measure>
    <measure number="2">
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>12</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>4</actual-notes><normal-notes>3</normal-notes></time-modification>
        <notations><tuplet type="start" bracket="yes"/></notations>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>12</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>4</actual-notes><normal-notes>3</normal-notes></time-modification>
      </note>
    </measure>
    <measure number="3">
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>12</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>4</actual-notes><normal-notes>3</normal-notes></time-modification>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch>
        <duration>12</duration><voice>1</voice><type>quarter</type>
        <time-modification><actual-notes>4</actual-notes><normal-notes>3</normal-notes></time-modification>
        <notations><tuplet type="stop"/></notations>
      </note>
    </measure>
  </part>
</score-partwise>`;
		const doc = await new DefaultScoreParser().parse(xml);
		const reader = new ScoreReader(new DynamicGlyphs());
		const measures = doc.score.parts[0]?.measures ?? [];
		const allChords = measures.flatMap((m) => m.chords);
		const notes = allChords.map(() => makeNote('g/4', 'q', Stem.UP));
		const byLead = mapByLead(allChords, notes);

		const builder = new TupletBuilder(reader, Appearance.NONE);
		const split = builder.buildCrossBarline(allChords, byLead, {
			splitBySystem: (group) => [group.slice(0, 2), group.slice(2)],
		});
		// Measure 1's within-measure triplet is skipped; measures 2-3 split into 2 segments.
		expect(split).toHaveLength(2);
		expect(split[0]?.getNotes()).toEqual(notes.slice(3, 5));
		expect(split[1]?.getNotes()).toEqual(notes.slice(5, 7));
	});
});

async function parseScore(measureXml: string) {
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>P1</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>12</divisions>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      ${measureXml}
    </measure>
  </part>
</score-partwise>`;
	const doc = await new DefaultScoreParser().parse(xml);
	const reader = new ScoreReader(new DynamicGlyphs());
	const measure = doc.score.parts[0]?.measures[0];
	if (!measure) {
		throw new Error('missing measure');
	}
	const chords = measure.chords;
	return { reader, chords };
}

function mapByLead(
	chords: { lead: Note }[],
	notes: StaveNote[],
): Map<Note, StaveNote> {
	const byLead = new Map<Note, StaveNote>();
	for (let i = 0; i < chords.length; i++) {
		const chord = chords[i];
		const note = notes[i];
		if (chord && note) {
			byLead.set(chord.lead, note);
		}
	}
	return byLead;
}

function tupletOptions(tuplet: DisplayTuplet | undefined): {
	bracketed?: boolean;
	yOffset?: number;
} {
	return (
		(
			tuplet as unknown as {
				options?: { bracketed?: boolean; yOffset?: number };
			}
		)?.options ?? {}
	);
}

function makeNote(
	key: string,
	duration: string,
	stemDirection: number,
	dots = 0,
): StaveNote {
	const note = new StaveNote({
		keys: [key],
		duration,
		dots,
		stemDirection,
	});
	for (let i = 0; i < dots; i++) {
		Dot.buildAndAttach([note]);
	}
	return note;
}
