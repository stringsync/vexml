import { describe, expect, it } from 'bun:test';
import { MDOMParser, type Measure, type Note } from '@stringsync/mdom';
import {
	Accidental,
	type Element,
	Metrics,
	Modifier,
	NoteHead,
	Ornament,
	Registry,
	Stave,
	StaveNote,
	Stem,
} from 'vexflow/core';
import { BarlineTranslator } from './barline-translator';
import { ChordTranslator } from './chord-translator';
import { DurationTranslator } from './duration-translator';
import { DynamicGlyphs } from './dynamic-glyphs';
import { NotationTranslator } from './notation-translator';
import { ScoreReader } from './score-reader';
import { SpannerBuilder } from './spanner-builder';
import { TabVoiceTranslator } from './tab-voice-translator';
import { VexmlStaveNote } from './vexml-stave-note';
import { VoiceBuilder } from './voice-builder';
import { VoiceTranslator } from './voice-translator';

describe('ChordTranslator', () => {
	it('builds each note’s heads only in vexflow’s constructor, beamed or not', () => {
		// vexflow registers every element it creates with the default registry, in creation
		// order: a note's heads follow it, and a head rebuilt later lands after some note
		// and pushes that note past its constructor's one build.
		const registry = new CreationOrder();
		Registry.enableDefaultRegistry(registry);
		try {
			const measure = parse(XML);
			const { builder, byLead } = makeBuilder();
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
			// One build per note, the constructor's own: its setStemDirection (or autoStem)
			// resets the note, building a head per key.
			const heads = registry.headsByNote();
			expect(
				[...heads].map(([note, count]) => count / note.keys.length),
			).toEqual([...heads].map(() => 1));
			expect(heads.size).toBe(byLead.size);
			// The beams still point where vexflow's auto-stemming would: the high group down, and
			// the slash head survived it.
			const slash = [...byLead.values()][1];
			expect(slash?.getStemDirection()).toBe(Stem.DOWN);
			expect(slash?.noteHeads[0]?.getText()).toBe('\uE100');
		} finally {
			Registry.disableDefaultRegistry();
		}
	});

	it('circles half and whole cross noteheads unless filled is set explicitly', () => {
		const reader = new ScoreReader(new DynamicGlyphs());
		const durations = new DurationTranslator(reader);
		const chords = new ChordTranslator(
			durations,
			new NotationTranslator(reader),
			reader,
		);
		const xMeasure = parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><notehead>x</notehead></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>half</type><notehead>x</notehead></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><type>whole</type><notehead>x</notehead></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>half</type><notehead filled="yes">x</notehead></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><notehead filled="no">x</notehead></note>
    </measure>
  </part>
</score-partwise>`);
		const glyphs = xMeasure.notes.map((n) => {
			const sn = chords.staveNote(
				{ lead: n, notes: [n], measureBeat: null },
				'treble',
				{},
			);
			return sn.noteHeads[0]?.getText();
		});
		expect(glyphs).toEqual([
			'\uE0A9', // quarter x -> noteheadXBlack
			'\uE0B3', // half x -> noteheadCircleX
			'\uE0B3', // whole x -> noteheadCircleX
			'\uE0A9', // half x filled="yes" -> noteheadXBlack
			'\uE0A8', // quarter x filled="no" -> noteheadXHalf
		]);
	});

	it('shortens outward stems progressively outside the stave down to 2.5 spaces', () => {
		const reader = new ScoreReader(new DynamicGlyphs());
		const durations = new DurationTranslator(reader);
		const chords = new ChordTranslator(
			durations,
			new NotationTranslator(reader),
			reader,
		);
		const measure = parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>G</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>A</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>B</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>C</step><octave>6</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>E</step><octave>6</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice><type>quarter</type></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>2</voice><type>quarter</type></note>
      <note><pitch><step>A</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice><type>quarter</type></note>
      <note><pitch><step>F</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice><type>quarter</type></note>
      <note><pitch><step>A</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>C</step><octave>6</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>C</step><octave>6</octave></pitch><duration>1</duration><voice>1</voice><type>16th</type></note>
      <note><pitch><step>C</step><octave>6</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type><beam number="1">begin</beam></note>
    </measure>
  </part>
</score-partwise>`);
		const lengths = measure.notes.map((n) => {
			const defaultStem = n.voice === '1' ? 'up' : 'down';
			const sn = chords.staveNote(
				{ lead: n, notes: [n], measureBeat: null },
				'treble',
				{ defaultStem },
			);
			return sn.getStemLength();
		});
		expect(lengths).toEqual([
			35, // F5 up (top line)
			32.5, // G5 up (0.5 above)
			30, // A5 up (1 above)
			27.5, // B5 up (1.5 above)
			25, // C6 up (2 above)
			25, // E6 up (clamped at 2.5)
			35, // E4 down (bottom line)
			32.5, // D4 down (0.5 below)
			30, // C4 down (1 below)
			25, // A3 down (2 below)
			25, // F3 down (clamped at 2.5)
			30, // A5 eighth up
			30, // C6 eighth up (flagged stem floors at 3 so tail clears notehead)
			35, // C6 16th up (2 tails keep full stem)
			35, // C6 beamed eighth (sized by Beam)
		]);
		// Inward ledger-line note in a single voice is not shortened.
		const c6 = measure.notes[4];
		if (!c6) {
			throw new Error('missing C6');
		}
		const inward = chords.staveNote(
			{ lead: c6, notes: [c6], measureBeat: null },
			'treble',
			{},
		);
		expect(inward.getStemDirection()).toBe(Stem.DOWN);
		expect(inward.getStemLength()).toBe(40); // extends to middle line (7 - 3 = 4 spaces)
	});

	it('extends stems for extra flags and adds them on top of middle-line reach on ledger notes', () => {
		const reader = new ScoreReader(new DynamicGlyphs());
		const durations = new DurationTranslator(reader);
		const chords = new ChordTranslator(
			durations,
			new NotationTranslator(reader),
			reader,
		);
		const measure = parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>16</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>16th</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>32nd</type></note>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>64th</type></note>
      <note><pitch><step>C</step><octave>6</octave></pitch><duration>4</duration><voice>1</voice><type>16th</type></note>
      <note><pitch><step>E</step><octave>6</octave></pitch><duration>2</duration><voice>1</voice><type>32nd</type></note>
      <note><pitch><step>A</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice><type>16th</type></note>
      <note><pitch><step>F</step><octave>3</octave></pitch><duration>2</duration><voice>1</voice><type>32nd</type></note>
      <note><pitch><step>C</step><octave>6</octave></pitch><duration>4</duration><voice>1</voice><type>16th</type><beam number="1">begin</beam></note>
    </measure>
  </part>
</score-partwise>`);
		const lengths = measure.notes.map((n) => {
			const sn = chords.staveNote(
				{ lead: n, notes: [n], measureBeat: null },
				'treble',
				{},
			);
			return sn.getStemLength();
		});
		expect(lengths).toEqual([
			35, // G4 eighth (stays 3.5)
			35, // G4 16th (stays 3.5)
			42.5, // G4 32nd (+0.75)
			50, // G4 64th (+1.5)
			40, // C6 16th (reaches middle line)
			57.5, // E6 32nd (reaches middle line + 0.75)
			40, // A3 16th (reaches middle line)
			57.5, // F3 32nd (reaches middle line + 0.75)
			40, // C6 beamed 16th (sized by Beam, keeps middle-line reach)
		]);
	});

	it('lengthens a flagged chord’s stem when a starting tie curves on the stem side', () => {
		const reader = new ScoreReader(new DynamicGlyphs());
		const durations = new DurationTranslator(reader);
		const chords = new ChordTranslator(
			durations,
			new NotationTranslator(reader),
			reader,
		);
		const measure = parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>8</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <!-- Up-stem eighth chord, outer note B4 on a line, tied start -->
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>eighth</type><notations><tied type="start"/></notations></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>eighth</type><notations><tied type="start"/></notations></note>
      <note><chord/><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>eighth</type><notations><tied type="start"/></notations></note>
      <!-- Up-stem eighth chord, outer note C5 in a space, tied start -->
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>eighth</type><notations><tied type="start"/></notations></note>
      <note><chord/><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>eighth</type><notations><tied type="start"/></notations></note>
      <note><chord/><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>eighth</type><notations><tied type="start"/></notations></note>
      <!-- Down-stem eighth chord, outer note B4 on a line, tied start -->
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>eighth</type><notations><tied type="start"/></notations></note>
      <note><chord/><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>eighth</type><notations><tied type="start"/></notations></note>
      <note><chord/><pitch><step>F</step><octave>5</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>eighth</type><notations><tied type="start"/></notations></note>
      <!-- Tied stop-only eighth chord (ties arrive from the left, clear of the flag) -->
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><tie type="stop"/><voice>1</voice><type>eighth</type><notations><tied type="stop"/></notations></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><tie type="stop"/><voice>1</voice><type>eighth</type><notations><tied type="stop"/></notations></note>
      <note><chord/><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><tie type="stop"/><voice>1</voice><type>eighth</type><notations><tied type="stop"/></notations></note>
      <!-- Beamed tied chord (no flag) -->
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>eighth</type><beam number="1">begin</beam><notations><tied type="start"/></notations></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>eighth</type><notations><tied type="start"/></notations></note>
      <note><chord/><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><voice>1</voice><type>eighth</type><notations><tied type="start"/></notations></note>
      <!-- 32nd tied chord stacks with extra-flag length -->
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><tie type="start"/><voice>1</voice><type>32nd</type><notations><tied type="start"/></notations></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><tie type="start"/><voice>1</voice><type>32nd</type><notations><tied type="start"/></notations></note>
      <note><chord/><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><tie type="start"/><voice>1</voice><type>32nd</type><notations><tied type="start"/></notations></note>
    </measure>
  </part>
</score-partwise>`);
		const lengths = measure.chords.map((c) => {
			const sn = chords.staveNote(c, 'treble', {});
			return sn.getStemLength();
		});
		expect(lengths).toEqual([
			45, // E4-G4-B4 up eighth tied (+1 space for line)
			50, // F4-A4-C5 up eighth tied (+1.5 spaces for space)
			45, // B4-D5-F5 down eighth tied (+1 space for line)
			35, // stop-only tied chord (unchanged)
			35, // beamed tied chord (unchanged)
			52.5, // E4-G4-B4 up 32nd tied (+0.75 extra flag + 1 space)
		]);
	});

	it('hangs a lone whole rest from the fourth line and draws a breve rest with its own glyph', () => {
		const reader = new ScoreReader(new DynamicGlyphs());
		const durations = new DurationTranslator(reader);
		const chords = new ChordTranslator(
			durations,
			new NotationTranslator(reader),
			reader,
		);
		const restMeasure = parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>8</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><rest/><duration>8</duration><voice>1</voice><type>whole</type></note>
      <note><rest/><duration>4</duration><voice>1</voice><type>half</type></note>
      <note><rest/><duration>16</duration><voice>1</voice><type>breve</type></note>
    </measure>
  </part>
</score-partwise>`);
		const built = restMeasure.notes.map((n) =>
			chords.staveNote(
				{ lead: n, notes: [n], measureBeat: null },
				'treble',
				{},
			),
		);
		expect(built.map((sn) => sn.getKeyLine(0))).toEqual([4, 3, 3]);
		expect(built.map((sn) => sn.glyphProps.codeHead)).toEqual([
			'\uE4E3', // restWhole
			'\uE4E4', // restHalf
			'\uE4E2', // restDoubleWhole
		]);
	});

	it('draws cue-sized rests smaller than full-sized rests', () => {
		const reader = new ScoreReader(new DynamicGlyphs());
		const durations = new DurationTranslator(reader);
		const chords = new ChordTranslator(
			durations,
			new NotationTranslator(reader),
			reader,
		);
		const measure = parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><rest/><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><cue/><rest/><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><rest/><duration>2</duration><voice>1</voice><type size="cue">quarter</type></note>
    </measure>
  </part>
</score-partwise>`);
		const built = measure.notes.map((n) =>
			chords.staveNote(
				{ lead: n, notes: [n], measureBeat: null },
				'treble',
				{},
			),
		);
		const [fullRest, cueTagRest, cueSizeRest] = built;
		expect(built.every((sn) => sn.isRest())).toBe(true);
		const fullSize = fullRest?.noteHeads[0]?.fontSizeInPoints ?? 0;
		const cueTagSize = cueTagRest?.noteHeads[0]?.fontSizeInPoints ?? 0;
		const cueSize = cueSizeRest?.noteHeads[0]?.fontSizeInPoints ?? 0;
		expect(cueTagSize).toBeGreaterThan(0);
		expect(cueTagSize).toBeLessThan(fullSize);
		expect(cueSize).toBe(cueTagSize);
	});

	it('draws standalone accidental-marks small above the note, or below when placed below', () => {
		const reader = new ScoreReader(new DynamicGlyphs());
		const durations = new DurationTranslator(reader);
		const chords = new ChordTranslator(
			durations,
			new NotationTranslator(reader),
			reader,
		);
		const measure = parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type><notations><accidental-mark>sharp</accidental-mark></notations></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><notations><accidental-mark placement="below">flat</accidental-mark></notations></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><notations><ornaments><accidental-mark>natural</accidental-mark></ornaments></notations></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type><notations><ornaments><trill-mark/><accidental-mark>flat</accidental-mark></ornaments></notations></note>
    </measure>
  </part>
</score-partwise>`);
		const ornaments = measure.notes.map((n) => {
			const sn = chords.staveNote(
				{ lead: n, notes: [n], measureBeat: null },
				'treble',
				{},
			);
			return sn
				.getModifiers()
				.filter((m): m is Ornament => m instanceof Ornament);
		});
		const small = Metrics.get('Accidental.grace.fontSize');
		expect(
			ornaments.map((list) =>
				list.map((o) => ({
					text: o.getText(),
					position: o.getPosition(),
					size: o.fontSizeInPoints,
				})),
			),
		).toEqual([
			[{ text: '\uE262', position: Modifier.Position.ABOVE, size: small }],
			[{ text: '\uE260', position: Modifier.Position.BELOW, size: small }],
			[{ text: '\uE261', position: Modifier.Position.ABOVE, size: small }],
			[{ text: '\uE566', position: Modifier.Position.ABOVE, size: 30 }],
		]);
	});

	it('repeats a tied-into accidental only when opening a new system', () => {
		const reader = new ScoreReader(new DynamicGlyphs());
		const durations = new DurationTranslator(reader);
		const chords = new ChordTranslator(
			durations,
			new NotationTranslator(reader),
			reader,
		);
		const measure = parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><key><fifths>1</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <!-- 0: tied-into G#4 with explicit <accidental> -->
      <note><pitch><step>G</step><alter>1</alter><octave>4</octave></pitch><duration>4</duration><tie type="stop"/><voice>1</voice><type>quarter</type><accidental>sharp</accidental><notations><tied type="stop"/></notations></note>
      <!-- 1: tied-into G#4 without <accidental> (differs from G major key) -->
      <note><pitch><step>G</step><alter>1</alter><octave>4</octave></pitch><duration>4</duration><tie type="stop"/><voice>1</voice><type>quarter</type><notations><tied type="stop"/></notations></note>
      <!-- 2: tied-into F4 natural without <accidental> (differs from G major F#) -->
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><tie type="stop"/><voice>1</voice><type>quarter</type><notations><tied type="stop"/></notations></note>
      <!-- 3: tied-into F#4 without <accidental> (in G major key) -->
      <note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>4</duration><tie type="stop"/><voice>1</voice><type>quarter</type><notations><tied type="stop"/></notations></note>
    </measure>
  </part>
</score-partwise>`);
		const gMajor = new Map([['F', 1]]);
		const signs = (
			note: Note,
			opensSystem = false,
			keyAlters?: ReadonlyMap<string, number>,
		) =>
			chords
				.staveNote({ lead: note, notes: [note], measureBeat: null }, 'treble', {
					opensSystem,
					keyAlters,
				})
				.getModifiers()
				.filter((m): m is Accidental => m instanceof Accidental)
				.map((a) => a.type);

		const [explicitSharp, implicitSharp, implicitNatural, inKey] =
			measure.notes;
		if (!explicitSharp || !implicitSharp || !implicitNatural || !inKey) {
			throw new Error('missing notes');
		}
		// Inside a system: all tied-into accidentals are suppressed.
		expect(signs(explicitSharp)).toEqual([]);
		expect(signs(implicitSharp, false, gMajor)).toEqual([]);
		// Opening a new system: explicit or out-of-key tied-into accidentals repeat; in-key does not.
		expect(signs(explicitSharp, true, gMajor)).toEqual(['#']);
		expect(signs(implicitSharp, true, gMajor)).toEqual(['#']);
		expect(signs(implicitNatural, true, gMajor)).toEqual(['n']);
		expect(signs(inKey, true, gMajor)).toEqual([]);
	});

	it('places a mordent accidental-mark below and upper-neighbour ornament marks above, honoring explicit placement', () => {
		const reader = new ScoreReader(new DynamicGlyphs());
		const durations = new DurationTranslator(reader);
		const chords = new ChordTranslator(
			durations,
			new NotationTranslator(reader),
			reader,
		);
		const measure = parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type><notations><ornaments><trill-mark/><accidental-mark>flat</accidental-mark></ornaments></notations></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><notations><ornaments><mordent/><accidental-mark>sharp</accidental-mark></ornaments></notations></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><notations><ornaments><inverted-mordent/><accidental-mark>sharp</accidental-mark></ornaments></notations></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><notations><ornaments><mordent/><accidental-mark placement="above">sharp</accidental-mark></ornaments></notations></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type><notations><ornaments><trill-mark/><accidental-mark placement="below">flat</accidental-mark></ornaments></notations></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type><notations><ornaments><turn/><accidental-mark placement="above">sharp</accidental-mark><accidental-mark placement="above">flat</accidental-mark></ornaments></notations></note>
    </measure>
  </part>
</score-partwise>`);
		const slots = measure.notes.map((n) => {
			const sn = chords.staveNote(
				{ lead: n, notes: [n], measureBeat: null },
				'treble',
				{},
			);
			const ornament = sn
				.getModifiers()
				.find((m): m is Ornament => m instanceof Ornament);
			const raw = ornament as unknown as {
				accidentalUpper?: { getText(): string };
				accidentalLower?: { getText(): string };
			};
			return {
				upper: raw.accidentalUpper?.getText() ?? null,
				lower: raw.accidentalLower?.getText() ?? null,
			};
		});
		expect(slots).toEqual([
			{ upper: '\uE260', lower: null }, // trill default -> above
			{ upper: null, lower: '\uE262' }, // mordent default -> below
			{ upper: '\uE262', lower: null }, // inverted-mordent default -> above
			{ upper: '\uE262', lower: null }, // mordent explicit above
			{ upper: null, lower: '\uE260' }, // trill explicit below
			{ upper: '\uE262', lower: '\uE260' }, // turn with two marks keeps both slots
		]);
	});

	it('stems single-voice grace notes up and lower-voice grace notes down on a two-voice stave', () => {
		const reader = new ScoreReader(new DynamicGlyphs());
		const singleMeasure = parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><grace slash="yes"/><pitch><step>E</step><octave>4</octave></pitch><type>eighth</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><grace slash="yes"/><pitch><step>A</step><octave>5</octave></pitch><type>eighth</type></note>
      <note><pitch><step>G</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type></note>
      <note><grace slash="yes"/><pitch><step>F</step><octave>5</octave></pitch><type>eighth</type><stem>down</stem></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
  </part>
</score-partwise>`);
		const single = makeBuilder();
		single.builder.buildNotes(
			new Stave(0, 0, 400),
			0,
			reader.staffVoices(singleMeasure, '1'),
			'treble',
			{},
		);
		const singleGraces = singleMeasure.notes
			.filter((n) => n.isGrace)
			.map((n) => single.byLead.get(n)?.getStemDirection());
		expect(singleGraces).toEqual([Stem.UP, Stem.UP, Stem.DOWN]);

		const twoVoiceMeasure = parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><grace slash="yes"/><pitch><step>E</step><octave>5</octave></pitch><voice>1</voice><type>eighth</type></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>16</duration><voice>1</voice><type>whole</type></note>
      <backup><duration>16</duration></backup>
      <note><grace slash="yes"/><pitch><step>G</step><octave>4</octave></pitch><voice>2</voice><type>eighth</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>16</duration><voice>2</voice><type>whole</type></note>
    </measure>
  </part>
</score-partwise>`);
		const twoVoice = makeBuilder();
		twoVoice.builder.buildNotes(
			new Stave(0, 0, 400),
			0,
			reader.staffVoices(twoVoiceMeasure, '1'),
			'treble',
			{},
		);
		const twoVoiceGraces = twoVoiceMeasure.notes
			.filter((n) => n.isGrace)
			.map((n) => twoVoice.byLead.get(n)?.getStemDirection());
		expect(twoVoiceGraces).toEqual([Stem.UP, Stem.DOWN]);
	});

	it('marks <notehead>none</notehead> members hidden while keeping stems and beams', () => {
		const measure = parse(`<?xml version="1.0"?>
			<score-partwise version="4.0">
				<part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>
				<part id="P1">
					<measure number="1">
						<attributes>
							<divisions>2</divisions>
							<time><beats>4</beats><beat-type>4</beat-type></time>
							<clef><sign>G</sign><line>2</line></clef>
						</attributes>
						${note('B', 4, 1, 1, 'begin', '<notehead>none</notehead>')}
						${note('B', 4, 1, 1, 'end', '<notehead>none</notehead>')}
						<note>
							<pitch><step>G</step><octave>4</octave></pitch>
							<duration>2</duration><voice>1</voice><type>quarter</type>
						</note>
						<note>
							<chord/>
							<pitch><step>B</step><octave>4</octave></pitch>
							<duration>2</duration><voice>1</voice><type>quarter</type>
							<notehead>none</notehead>
						</note>
					</measure>
				</part>
			</score-partwise>`);
		const reader = new ScoreReader(new DynamicGlyphs());
		const built = makeBuilder();
		built.builder.buildNotes(
			new Stave(0, 0, 400),
			0,
			reader.staffVoices(measure, '1'),
			'treble',
			{},
		);
		const notes = measure.notes
			.map((n) => built.byLead.get(n))
			.filter((n): n is StaveNote => n !== undefined);
		expect(notes.map((n) => n?.hasStem())).toEqual([true, true, true]);
		expect(
			notes.map((n) =>
				n instanceof VexmlStaveNote ? [...n.hiddenNoteHeads] : null,
			),
		).toEqual([[0], [0], [1]]);
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
		new ChordTranslator(durations, new NotationTranslator(reader), reader),
		durations,
		new BarlineTranslator(),
		reader,
	);
	const byLead = new Map<Note, StaveNote>();
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
	return { builder, byLead };
}

/* A vexflow registry that keeps the order its elements were created in. */
class CreationOrder extends Registry {
	private readonly created: Element[] = [];

	override register(elem: Element, id?: string): this {
		this.created.push(elem);
		return super.register(elem, id);
	}

	/* How many note heads were built for each StaveNote, crediting each head to the
	 * last StaveNote created before it. */
	headsByNote(): Map<StaveNote, number> {
		const counts = new Map<StaveNote, number>();
		let note: StaveNote | undefined;
		for (const elem of this.created) {
			if (elem instanceof StaveNote) {
				note = elem;
				counts.set(note, 0);
			} else if (elem instanceof NoteHead && note) {
				counts.set(note, (counts.get(note) ?? 0) + 1);
			}
		}
		return counts;
	}
}
