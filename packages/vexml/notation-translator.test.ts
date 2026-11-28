import { describe, expect, it } from 'bun:test';
import { type Chord, MDOMParser } from '@stringsync/mdom';
import {
	CanvasContext,
	GraceNoteGroup,
	Modifier,
	Stave,
	StaveNote,
	Stem,
	TickContext,
} from 'vexflow/core';
import { DynamicGlyphs } from './dynamic-glyphs';
import { FakePaintProbe } from './fake-paint-probe';
import { FingeringAnnotation } from './fingering-annotation';
import { isDiamondHarmonic } from './harmonic-kind';
import { NotationTranslator } from './notation-translator';
import { NoteheadArticulation } from './notehead-articulation';
import { PaintContext } from './paint-context';
import { PaintList } from './paint-list';
import { ProbeTextCanvas } from './probe-text-canvas';
import { ScoreReader } from './score-reader';
import { StaveArticulation } from './stave-articulation';
import { StaveOrnament } from './stave-ornament';
import { StringNumberAnnotation } from './string-number-annotation';
import { VexmlGraceNote } from './vexml-grace-note';

describe('NotationTranslator articulations', () => {
	it('places strong accents above the stave regardless of stem direction unless placement="below"', () => {
		const [upChord, downChord, belowChord] = parseChords(`
			<note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><articulations><strong-accent/></articulations></notations></note>
			<note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type><notations><articulations><strong-accent/></articulations></notations></note>
			<note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><articulations><strong-accent placement="below"/></articulations></notations></note>
		`);
		if (!upChord || !downChord || !belowChord) {
			throw new Error('expected three chords');
		}
		const translator = new NotationTranslator(
			new ScoreReader(new DynamicGlyphs()),
		);

		const upNote = makeNote('g/4', Stem.UP);
		translator.attach(upNote, upChord);
		const upMark = upNote.getModifiers()[0];
		expect(upMark).toBeInstanceOf(StaveArticulation);
		expect(upMark).not.toBeInstanceOf(NoteheadArticulation);
		expect(upMark?.getPosition()).toBe(Modifier.Position.ABOVE);

		const downNote = makeNote('d/5', Stem.DOWN);
		translator.attach(downNote, downChord);
		const downMark = downNote.getModifiers()[0];
		expect(downMark).toBeInstanceOf(StaveArticulation);
		expect(downMark?.getPosition()).toBe(Modifier.Position.ABOVE);

		const belowNote = makeNote('g/4', Stem.UP);
		translator.attach(belowNote, belowChord);
		const belowMark = belowNote.getModifiers()[0];
		expect(belowMark).toBeInstanceOf(StaveArticulation);
		expect(belowMark?.getPosition()).toBe(Modifier.Position.BELOW);
	});

	it('keeps accents and staccatissimo wedges outside the stave', () => {
		const chords = parseChords(`
			<note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><articulations><accent/></articulations></notations></note>
			<note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><articulations><staccatissimo/></articulations></notations></note>
		`);
		const translator = new NotationTranslator(
			new ScoreReader(new DynamicGlyphs()),
		);
		new ProbeTextCanvas(new FakePaintProbe()).install();
		const ctx = new CanvasContext(
			new PaintContext(
				new PaintList(),
				new FakePaintProbe(),
				null,
			) as unknown as CanvasRenderingContext2D,
		);
		const stave = new Stave(0, 0, 200);

		const outside = chords.map((chord) => {
			const note = makeNote('a/4', Stem.UP, stave);
			translator.attach(note, chord);
			new TickContext().addTickable(note).preFormat().setX(50);
			const mark = note.getModifiers()[0] as StaveArticulation;
			mark.setContext(ctx);
			mark.draw();
			return mark.getY() > stave.getYForLine(4);
		});
		expect(outside).toEqual([true, true]);
	});

	it('marks end accents outside a slur while keeping staccato inside', () => {
		const [startChord, midChord, stopChord] = parseChords(`
			<note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type><notations><articulations><accent/><staccato/></articulations><slur type="start" number="1" placement="above"/></notations></note>
			<note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type><notations><articulations><accent/></articulations></notations></note>
			<note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type><notations><articulations><accent/></articulations><slur type="stop" number="1"/></notations></note>
		`);
		if (!startChord || !midChord || !stopChord) {
			throw new Error('expected three chords');
		}
		const translator = new NotationTranslator(
			new ScoreReader(new DynamicGlyphs()),
		);

		const startNote = makeNote('d/5', Stem.DOWN);
		translator.attach(startNote, startChord);
		const [startAccent, startStaccato] =
			startNote.getModifiers() as StaveArticulation[];
		expect(startAccent?.sitsOutsideSlur(startNote)).toBe(true);
		expect(startStaccato?.sitsOutsideSlur(startNote)).toBe(false);

		const midNote = makeNote('e/5', Stem.DOWN);
		translator.attach(midNote, midChord);
		const [midAccent] = midNote.getModifiers() as StaveArticulation[];
		expect(midAccent?.sitsOutsideSlur(midNote)).toBe(false);

		// Stop marker inherits placement="above" from its start partner.
		const stopNote = makeNote('d/5', Stem.DOWN);
		translator.attach(stopNote, stopChord);
		const [stopAccent] = stopNote.getModifiers() as StaveArticulation[];
		expect(stopAccent?.sitsOutsideSlur(stopNote)).toBe(true);
	});

	it('honours explicit placement on tenuto lines while keeping unspecified tenutos on the notehead side', () => {
		const [aboveChord, belowChord, defaultChord] = parseChords(`
			<note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><articulations><tenuto placement="above"/></articulations></notations></note>
			<note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type><notations><articulations><tenuto placement="below"/></articulations></notations></note>
			<note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><articulations><tenuto/></articulations></notations></note>
		`);
		if (!aboveChord || !belowChord || !defaultChord) {
			throw new Error('expected three chords');
		}
		const translator = new NotationTranslator(
			new ScoreReader(new DynamicGlyphs()),
		);

		const aboveNote = makeNote('g/4', Stem.UP);
		translator.attach(aboveNote, aboveChord);
		const aboveMark = aboveNote.getModifiers()[0];
		expect(aboveMark).toBeInstanceOf(StaveArticulation);
		expect(aboveMark).not.toBeInstanceOf(NoteheadArticulation);
		expect(aboveMark?.getPosition()).toBe(Modifier.Position.ABOVE);

		const belowNote = makeNote('d/5', Stem.DOWN);
		translator.attach(belowNote, belowChord);
		const belowMark = belowNote.getModifiers()[0];
		expect(belowMark).toBeInstanceOf(StaveArticulation);
		expect(belowMark).not.toBeInstanceOf(NoteheadArticulation);
		expect(belowMark?.getPosition()).toBe(Modifier.Position.BELOW);

		const defaultNote = makeNote('g/4', Stem.UP);
		translator.attach(defaultNote, defaultChord);
		const defaultMark = defaultNote.getModifiers()[0];
		expect(defaultMark).toBeInstanceOf(NoteheadArticulation);
		expect(defaultMark?.getPosition()).toBe(Modifier.Position.BELOW);
	});

	it('attaches trill marks from every chord member and honours explicit placement', () => {
		const [doubleTrill, belowTrill, aboveTrill] = parseChords(`
			<note><pitch><step>A</step><octave>4</octave></pitch><duration>8</duration><type>half</type><notations><ornaments><trill-mark/></ornaments></notations></note>
			<note><chord/><pitch><step>C</step><octave>5</octave></pitch><duration>8</duration><type>half</type><notations><ornaments><trill-mark/></ornaments></notations></note>
			<note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><ornaments><trill-mark placement="below"/></ornaments></notations></note>
			<note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><ornaments><trill-mark placement="above"/></ornaments></notations></note>
		`);
		if (!doubleTrill || !belowTrill || !aboveTrill) {
			throw new Error('expected three chords');
		}
		const translator = new NotationTranslator(
			new ScoreReader(new DynamicGlyphs()),
		);

		const chordNote = new StaveNote({
			keys: ['a/4', 'c/5'],
			duration: 'h',
			stemDirection: Stem.DOWN,
		});
		translator.attach(chordNote, doubleTrill);
		const chordTrills = chordNote
			.getModifiers()
			.filter((m): m is StaveOrnament => m instanceof StaveOrnament);
		expect(chordTrills).toHaveLength(2);
		expect(chordTrills.every((t) => t.isTrill && !t.explicitPlacement)).toBe(
			true,
		);

		const belowNote = makeNote('g/4', Stem.DOWN);
		translator.attach(belowNote, belowTrill);
		const belowMark = belowNote.getModifiers()[0] as StaveOrnament;
		expect(belowMark).toBeInstanceOf(StaveOrnament);
		expect(belowMark.explicitPlacement).toBe(true);
		expect(belowMark.getPosition()).toBe(Modifier.Position.BELOW);

		const aboveNote = makeNote('g/4', Stem.DOWN);
		translator.attach(aboveNote, aboveTrill);
		const aboveMark = aboveNote.getModifiers()[0] as StaveOrnament;
		expect(aboveMark).toBeInstanceOf(StaveOrnament);
		expect(aboveMark.explicitPlacement).toBe(true);
		expect(aboveMark.getPosition()).toBe(Modifier.Position.ABOVE);
	});

	it('scales grace-note articulations and places them outside the stave', () => {
		const [staccChord, accentChord, aboveChord] = parseChords(`
			<note><grace slash="yes"/><pitch><step>G</step><octave>4</octave></pitch><type>eighth</type><notations><articulations><staccato/></articulations></notations></note>
			<note><grace slash="yes"/><pitch><step>B</step><octave>4</octave></pitch><type>eighth</type><notations><articulations><accent/></articulations></notations></note>
			<note><grace slash="yes"/><pitch><step>G</step><octave>4</octave></pitch><type>eighth</type><notations><articulations><staccato placement="above"/></articulations></notations></note>
		`);
		if (!staccChord || !accentChord || !aboveChord) {
			throw new Error('expected three grace chords');
		}
		const translator = new NotationTranslator(
			new ScoreReader(new DynamicGlyphs()),
		);
		new ProbeTextCanvas(new FakePaintProbe()).install();
		const ctx = new CanvasContext(
			new PaintContext(
				new PaintList(),
				new FakePaintProbe(),
				null,
			) as unknown as CanvasRenderingContext2D,
		);
		const stave = new Stave(0, 0, 200);
		const topLine = stave.getYForLine(0);
		const bottomLine = stave.getYForLine(4);

		const drawGrace = (key: string, chord: Chord) => {
			const grace = new VexmlGraceNote({
				keys: [key],
				duration: '8',
				slash: true,
				stemDirection: Stem.UP,
			});
			translator.attachGrace(grace, chord);
			const host = makeNote('a/4', Stem.UP, stave);
			const group = new GraceNoteGroup([grace]);
			group.preFormat();
			host.addModifier(group, 0);
			new TickContext().addTickable(host).preFormat().setX(80);
			host.setContext(ctx).draw();
			return {
				grace,
				mark: grace.getModifiers()[0] as StaveArticulation,
			};
		};

		const stacc = drawGrace('g/4', staccChord);
		const accent = drawGrace('b/4', accentChord);
		const above = drawGrace('g/4', aboveChord);
		const regularSize = new StaveArticulation('a>').fontSizeInPoints;

		expect(stacc.mark.fontSizeInPoints).toBeCloseTo(
			regularSize * stacc.grace.getFontScale(),
			5,
		);
		expect(stacc.mark.getY()).toBeGreaterThan(bottomLine);
		expect(accent.mark.fontSizeInPoints).toBeCloseTo(
			regularSize * accent.grace.getFontScale(),
			5,
		);
		expect(accent.mark.getY()).toBeGreaterThan(bottomLine);
		expect(above.mark.getPosition()).toBe(Modifier.Position.ABOVE);
		expect(above.mark.getY()).toBeLessThan(topLine);
	});

	it('marks default fermatas invertible while preserving explicit type="upright" and type="inverted"', () => {
		const [defaultChord, uprightChord, invertedChord, angledChord] =
			parseChords(`
			<note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><fermata>normal</fermata></notations></note>
			<note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><fermata type="upright">normal</fermata></notations></note>
			<note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><fermata type="inverted">normal</fermata></notations></note>
			<note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><fermata>angled</fermata></notations></note>
		`);
		if (!defaultChord || !uprightChord || !invertedChord || !angledChord) {
			throw new Error('expected four chords');
		}
		const translator = new NotationTranslator(
			new ScoreReader(new DynamicGlyphs()),
		);

		const defaultNote = makeNote('g/4', Stem.DOWN);
		translator.attach(defaultNote, defaultChord);
		const defaultFermata = defaultNote.getModifiers()[0] as StaveArticulation;
		expect(defaultFermata.getPosition()).toBe(Modifier.Position.ABOVE);
		defaultFermata.invertFermata();
		expect(defaultFermata.getPosition()).toBe(Modifier.Position.BELOW);
		expect(defaultFermata.getText()).toBe('\uE4C1');

		const uprightNote = makeNote('g/4', Stem.DOWN);
		translator.attach(uprightNote, uprightChord);
		const uprightFermata = uprightNote.getModifiers()[0] as StaveArticulation;
		uprightFermata.invertFermata();
		expect(uprightFermata.getPosition()).toBe(Modifier.Position.ABOVE);
		expect(uprightFermata.getText()).toBe('\uE4C0');

		const invertedNote = makeNote('g/4', Stem.UP);
		translator.attach(invertedNote, invertedChord);
		const invertedFermata = invertedNote.getModifiers()[0] as StaveArticulation;
		expect(invertedFermata.getPosition()).toBe(Modifier.Position.BELOW);
		expect(invertedFermata.getText()).toBe('\uE4C1');

		const angledNote = makeNote('g/4', Stem.DOWN);
		translator.attach(angledNote, angledChord);
		const angledFermata = angledNote.getModifiers()[0] as StaveArticulation;
		angledFermata.invertFermata();
		expect(angledFermata.getPosition()).toBe(Modifier.Position.BELOW);
		expect(angledFermata.getText()).toBe('\uE4C5');
	});

	it('draws bare <harmonic/> as a normal notehead with a harmonic circle above while keeping <natural/> and <artificial/> as diamonds', () => {
		const [bare, natural, artificial, sounding, touching, base] = parseChords(`
			<note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type><notations><technical><harmonic/></technical></notations></note>
			<note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type><notations><technical><harmonic><natural/></harmonic></technical></notations></note>
			<note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type><notations><technical><harmonic><artificial/></harmonic></technical></notations></note>
			<note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type><notations><technical><harmonic><sounding-pitch/></harmonic></technical></notations></note>
			<note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type><notations><technical><harmonic><touching-pitch/></harmonic></technical></notations></note>
			<note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><type>quarter</type><notations><technical><harmonic><base-pitch/></harmonic></technical></notations></note>
		`);
		if (!bare || !natural || !artificial || !sounding || !touching || !base) {
			throw new Error('expected six chords');
		}
		const reader = new ScoreReader(new DynamicGlyphs());
		const translator = new NotationTranslator(reader);

		expect(isDiamondHarmonic(bare.lead, reader)).toBe(false);
		expect(isDiamondHarmonic(natural.lead, reader)).toBe(true);
		expect(isDiamondHarmonic(artificial.lead, reader)).toBe(true);
		expect(isDiamondHarmonic(sounding.lead, reader)).toBe(false);
		expect(isDiamondHarmonic(touching.lead, reader)).toBe(true);
		expect(isDiamondHarmonic(base.lead, reader)).toBe(false);

		const modifiersOf = (chord: Chord) => {
			const note = makeNote('g/4', Stem.DOWN);
			translator.attach(note, chord);
			return note.getModifiers();
		};
		expect(modifiersOf(bare)).toHaveLength(1);
		expect(modifiersOf(bare)[0]).toBeInstanceOf(StaveArticulation);
		expect(modifiersOf(bare)[0]?.getPosition()).toBe(Modifier.Position.ABOVE);
		expect(modifiersOf(sounding)).toHaveLength(1);
		expect(modifiersOf(natural)).toHaveLength(0);
		expect(modifiersOf(artificial)).toHaveLength(0);
		expect(modifiersOf(touching)).toHaveLength(0);
		expect(modifiersOf(base)).toHaveLength(0);
	});

	it('places lower-note open-string and sounding-pitch harmonic circles below single-stemmed chords unless explicit or shared with a higher note', () => {
		const [
			lowerOpen,
			upperOpen,
			bothOpen,
			middleOpen,
			explicitAbove,
			lowerHarmonic,
			bothHarmonic,
		] = parseChords(`
			<note><pitch><step>D</step><octave>4</octave></pitch><duration>8</duration><type>half</type><notations><technical><open-string/></technical></notations></note>
			<note><chord/><pitch><step>B</step><octave>4</octave></pitch><duration>8</duration><type>half</type></note>

			<note><pitch><step>B</step><octave>4</octave></pitch><duration>8</duration><type>half</type></note>
			<note><chord/><pitch><step>E</step><octave>5</octave></pitch><duration>8</duration><type>half</type><notations><technical><open-string/></technical></notations></note>

			<note><pitch><step>D</step><octave>4</octave></pitch><duration>8</duration><type>half</type><notations><technical><open-string/></technical></notations></note>
			<note><chord/><pitch><step>A</step><octave>4</octave></pitch><duration>8</duration><type>half</type><notations><technical><open-string/></technical></notations></note>

			<note><pitch><step>G</step><octave>3</octave></pitch><duration>8</duration><type>half</type></note>
			<note><chord/><pitch><step>D</step><octave>4</octave></pitch><duration>8</duration><type>half</type><notations><technical><open-string/></technical></notations></note>
			<note><chord/><pitch><step>B</step><octave>4</octave></pitch><duration>8</duration><type>half</type></note>

			<note><pitch><step>D</step><octave>4</octave></pitch><duration>8</duration><type>half</type><notations><technical><open-string placement="above"/></technical></notations></note>
			<note><chord/><pitch><step>B</step><octave>4</octave></pitch><duration>8</duration><type>half</type></note>

			<note><pitch><step>A</step><octave>4</octave></pitch><duration>8</duration><type>half</type><notations><technical><harmonic><natural/><sounding-pitch/></harmonic></technical></notations></note>
			<note><chord/><pitch><step>F</step><alter>1</alter><octave>5</octave></pitch><duration>8</duration><type>half</type></note>

			<note><pitch><step>A</step><octave>4</octave></pitch><duration>8</duration><type>half</type><notations><technical><harmonic><natural/><sounding-pitch/></harmonic></technical></notations></note>
			<note><chord/><pitch><step>E</step><octave>5</octave></pitch><duration>8</duration><type>half</type><notations><technical><harmonic><natural/><sounding-pitch/></harmonic></technical></notations></note>
		`);
		if (
			!lowerOpen ||
			!upperOpen ||
			!bothOpen ||
			!middleOpen ||
			!explicitAbove ||
			!lowerHarmonic ||
			!bothHarmonic
		) {
			throw new Error('expected seven chords');
		}
		const reader = new ScoreReader(new DynamicGlyphs());
		const translator = new NotationTranslator(reader);
		const positionsOf = (chord: Chord, keys: string[]) => {
			const note = new StaveNote({
				keys,
				duration: 'h',
				stemDirection: Stem.UP,
			});
			translator.attach(note, chord);
			return note.getModifiers().map((m) => m.getPosition());
		};

		expect(positionsOf(lowerOpen, ['d/4', 'b/4'])).toEqual([
			Modifier.Position.BELOW,
		]);
		expect(positionsOf(upperOpen, ['b/4', 'e/5'])).toEqual([
			Modifier.Position.ABOVE,
		]);
		expect(positionsOf(bothOpen, ['d/4', 'a/4'])).toEqual([
			Modifier.Position.ABOVE,
			Modifier.Position.ABOVE,
		]);
		expect(positionsOf(middleOpen, ['g/3', 'd/4', 'b/4'])).toEqual([
			Modifier.Position.ABOVE,
		]);
		expect(positionsOf(explicitAbove, ['d/4', 'b/4'])).toEqual([
			Modifier.Position.ABOVE,
		]);
		expect(positionsOf(lowerHarmonic, ['a/4', 'f#/5'])).toEqual([
			Modifier.Position.BELOW,
		]);
		expect(positionsOf(bothHarmonic, ['a/4', 'e/5'])).toEqual([
			Modifier.Position.ABOVE,
			Modifier.Position.ABOVE,
		]);
	});

	it('defaults unplaced lower-stave keyboard fingerings below the bass stave while honouring explicit placement', () => {
		const doc = new MDOMParser().parseFromString(`
			<score-partwise version="4.0">
				<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
				<part id="P1">
					<measure number="1">
						<attributes>
							<divisions>4</divisions>
							<staves>2</staves>
							<clef number="1"><sign>G</sign><line>2</line></clef>
							<clef number="2"><sign>F</sign><line>4</line></clef>
						</attributes>
						<note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>quarter</type><staff>1</staff><notations><technical><fingering>1</fingering></technical></notations></note>
						<backup><duration>4</duration></backup>
						<note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice><type>quarter</type><staff>2</staff><notations><technical><fingering>5</fingering></technical></notations></note>
						<note><pitch><step>D</step><octave>3</octave></pitch><duration>4</duration><voice>2</voice><type>quarter</type><staff>2</staff><notations><technical><fingering placement="above">4</fingering></technical></notations></note>
					</measure>
				</part>
			</score-partwise>
		`);
		const chords = doc.score?.parts[0]?.measures[0]?.chords ?? [];
		const [upperChord, lowerDefaultChord, lowerExplicitAboveChord] = chords;
		if (!upperChord || !lowerDefaultChord || !lowerExplicitAboveChord) {
			throw new Error('expected three grand-staff chords');
		}
		const translator = new NotationTranslator(
			new ScoreReader(new DynamicGlyphs()),
		);

		const upperNote = makeNote('e/4', Stem.UP);
		translator.attach(upperNote, upperChord);
		const upperFingering = upperNote.getModifiers()[0] as FingeringAnnotation;
		expect(upperFingering).toBeInstanceOf(FingeringAnnotation);
		expect(upperFingering.below).toBe(false);

		const lowerDefaultNote = makeNote('c/3', Stem.UP);
		translator.attach(lowerDefaultNote, lowerDefaultChord);
		const lowerDefaultFingering =
			lowerDefaultNote.getModifiers()[0] as FingeringAnnotation;
		expect(lowerDefaultFingering).toBeInstanceOf(FingeringAnnotation);
		expect(lowerDefaultFingering.below).toBe(true);

		const lowerAboveNote = makeNote('d/3', Stem.DOWN);
		translator.attach(lowerAboveNote, lowerExplicitAboveChord);
		const lowerAboveFingering =
			lowerAboveNote.getModifiers()[0] as FingeringAnnotation;
		expect(lowerAboveFingering).toBeInstanceOf(FingeringAnnotation);
		expect(lowerAboveFingering.below).toBe(false);
	});

	it('italicizes <pluck> and stacks <fingering>, <pluck>, and <string> in outward order', () => {
		const [combined, pluckOnly] = parseChords(`
			<note>
				<pitch><step>C</step><octave>5</octave></pitch>
				<duration>4</duration><type>quarter</type>
				<notations>
					<technical>
						<string>2</string>
						<pluck>i</pluck>
						<fingering>1</fingering>
					</technical>
				</notations>
			</note>
			<note>
				<pitch><step>E</step><octave>4</octave></pitch>
				<duration>4</duration><type>quarter</type>
				<notations>
					<technical>
						<pluck>p</pluck>
					</technical>
				</notations>
			</note>
		`);
		if (!combined || !pluckOnly) {
			throw new Error('expected two guitar chords');
		}
		const translator = new NotationTranslator(
			new ScoreReader(new DynamicGlyphs()),
		);

		const combinedNote = makeNote('c/5', Stem.DOWN);
		translator.attach(combinedNote, combined);
		const mods = combinedNote.getModifiers();
		expect(mods).toHaveLength(3);
		const [lh, rh, str] = mods;
		expect(lh).toBeInstanceOf(FingeringAnnotation);
		expect((lh as FingeringAnnotation).getText()).toBe('1');
		expect((lh as FingeringAnnotation).italic).toBe(false);
		expect((lh as FingeringAnnotation).fontInfo.style).toBe('normal');
		expect(rh).toBeInstanceOf(FingeringAnnotation);
		expect((rh as FingeringAnnotation).getText()).toBe('i');
		expect((rh as FingeringAnnotation).italic).toBe(true);
		expect((rh as FingeringAnnotation).fontInfo.style).toBe('italic');
		expect(str?.constructor.name).toBe('StringNumberAnnotation');

		const pluckNote = makeNote('e/4', Stem.UP);
		translator.attach(pluckNote, pluckOnly);
		const pluckMod = pluckNote.getModifiers()[0] as FingeringAnnotation;
		expect(pluckMod).toBeInstanceOf(FingeringAnnotation);
		expect(pluckMod.getText()).toBe('p');
		expect(pluckMod.italic).toBe(true);
		expect(pluckMod.fontInfo.style).toBe('italic');
	});

	it('places unplaced guitar single-note <string> numbers below low notes and above high notes while preserving chords, explicit placement, and bowed-string defaults', () => {
		const guitarDoc = new MDOMParser().parseFromString(`
			<score-partwise version="4.0">
				<part-list><score-part id="P1"><part-name>Classical Guitar</part-name></score-part></part-list>
				<part id="P1">
					<measure number="1">
						<attributes><divisions>4</divisions><clef><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef></attributes>
						<note><pitch><step>A</step><octave>2</octave></pitch><duration>4</duration><type>quarter</type><notations><technical><string>5</string></technical></notations></note>
						<note><pitch><step>D</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type><notations><technical><string>4</string></technical></notations></note>
						<note><pitch><step>B</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type><notations><technical><string>2</string></technical></notations></note>
						<note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><technical><string>1</string></technical></notations></note>
						<note><pitch><step>A</step><octave>2</octave></pitch><duration>4</duration><type>quarter</type><notations><technical><string placement="above">5</string></technical></notations></note>
						<note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><technical><string placement="below">1</string></technical></notations></note>
						<note><pitch><step>D</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type><notations><technical><string>4</string></technical></notations></note>
						<note><chord/><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><type>quarter</type><notations><technical><string>3</string></technical></notations></note>
					</measure>
				</part>
			</score-partwise>
		`);
		const guitarChords = guitarDoc.score?.parts[0]?.measures[0]?.chords ?? [];
		const [lowA, lowD, midB, highE, explicitAbove, explicitBelow, lowChord] =
			guitarChords;
		if (
			!lowA ||
			!lowD ||
			!midB ||
			!highE ||
			!explicitAbove ||
			!explicitBelow ||
			!lowChord
		) {
			throw new Error('expected seven guitar chords');
		}
		const translator = new NotationTranslator(
			new ScoreReader(new DynamicGlyphs()),
		);
		const stringBelow = (key: string, chord: Chord) => {
			const note = makeNote(key, Stem.UP);
			translator.attach(note, chord);
			const mod = note.getModifiers()[0] as StringNumberAnnotation;
			expect(mod).toBeInstanceOf(StringNumberAnnotation);
			return mod.below;
		};
		expect(stringBelow('a/3', lowA)).toBe(true);
		expect(stringBelow('d/4', lowD)).toBe(true);
		expect(stringBelow('b/4', midB)).toBe(false);
		expect(stringBelow('e/5', highE)).toBe(false);
		expect(stringBelow('a/3', explicitAbove)).toBe(false);
		expect(stringBelow('e/5', explicitBelow)).toBe(true);

		const chordNote = new StaveNote({
			keys: ['d/4', 'g/4'],
			duration: 'q',
			stemDirection: Stem.UP,
		});
		translator.attach(chordNote, lowChord);
		expect(
			chordNote.getModifiers().map((m) => (m as StringNumberAnnotation).below),
		).toEqual([false, false]);

		// Bowed strings (Behind Bars p. 394) keep single-voice string designations above even on low notes.
		const violinDoc = new MDOMParser().parseFromString(`
			<score-partwise version="4.0">
				<part-list>
					<score-part id="P1">
						<part-name/>
						<score-instrument id="P1-I1">
							<instrument-name>Violin</instrument-name>
							<instrument-sound>strings.violin</instrument-sound>
						</score-instrument>
					</score-part>
				</part-list>
				<part id="P1">
					<measure number="1">
						<attributes><divisions>4</divisions><clef><sign>G</sign><line>2</line></clef></attributes>
						<note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type><notations><technical><string>3</string></technical></notations></note>
					</measure>
				</part>
			</score-partwise>
		`);
		const violinChord = violinDoc.score?.parts[0]?.measures[0]?.chords[0];
		if (!violinChord) {
			throw new Error('expected violin chord');
		}
		expect(stringBelow('d/4', violinChord)).toBe(false);
	});
});

function parseChords(notesXml: string): Chord[] {
	const doc = new MDOMParser().parseFromString(`
		<score-partwise version="4.0">
			<part-list><score-part id="P1"><part-name/></score-part></part-list>
			<part id="P1">
				<measure number="1">
					<attributes><divisions>4</divisions><clef><sign>G</sign><line>2</line></clef></attributes>
					${notesXml}
				</measure>
			</part>
		</score-partwise>
	`);
	const measure = doc.score?.parts[0]?.measures[0];
	if (!measure) {
		throw new Error('expected measure');
	}
	return measure.chords;
}

function makeNote(
	key: string,
	stemDirection: number,
	stave = new Stave(0, 0, 200),
): StaveNote {
	const note = new StaveNote({ keys: [key], duration: 'q', stemDirection });
	note.setStave(stave);
	return note;
}
