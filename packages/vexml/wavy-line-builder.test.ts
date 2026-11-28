import { beforeEach, describe, expect, it } from 'bun:test';
import type { Chord, Note } from '@stringsync/mdom';
import {
	Accidental,
	ModifierContext,
	type RenderContext,
	Stave,
	StaveNote,
	TickContext,
} from 'vexflow/core';
import { CurveConnectors } from './curve-connectors';
import { DefaultScoreParser } from './default-score-parser';
import { DynamicGlyphs } from './dynamic-glyphs';
import { FakePaintProbe } from './fake-paint-probe';
import { ProbeTextCanvas } from './probe-text-canvas';
import { ScoreReader } from './score-reader';
import { StaveOrnament } from './stave-ornament';
import { TrillLine } from './trill-line';
import { WavyLineBuilder } from './wavy-line-builder';

describe('WavyLineBuilder and TrillLine', () => {
	beforeEach(() => {
		new ProbeTextCanvas(new FakePaintProbe()).install();
	});
	it('runs a tied trill line across the tied note to the barline when it finishes the measure', async () => {
		const { chords, connectors } =
			await buildFixture(`<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name/></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>8</duration><tie type="start"/><type>half</type><notations><tied type="start"/><ornaments><trill-mark/><wavy-line type="start"/></ornaments></notations></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>8</duration><tie type="stop"/><type>half</type><notations><tied type="stop"/><ornaments><wavy-line type="stop"/></ornaments></notations></note>
    </measure>
  </part>
</score-partwise>`);
		const stave = new Stave(0, 40, 220);
		const first = makeStaveNote(stave, 40, { trill: true });
		const second = makeStaveNote(stave, 130);
		const [line] = new WavyLineBuilder(connectors).build(
			chords,
			mapByLead(chords, [first, second]),
		);
		expect(line).toBeInstanceOf(TrillLine);
		expect((line as TrillLine).end).toEqual({ kind: 'barline', stave });
	});

	it('runs a tied trill line to the following note when another note follows in the same measure', async () => {
		const { chords, connectors } =
			await buildFixture(`<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name/></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><tie type="start"/><type>quarter</type><notations><tied type="start"/><ornaments><trill-mark/><wavy-line type="start"/></ornaments></notations></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><tie type="stop"/><type>quarter</type><notations><tied type="stop"/><ornaments><wavy-line type="stop"/></ornaments></notations></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>8</duration><type>half</type></note>
    </measure>
  </part>
</score-partwise>`);
		const stave = new Stave(0, 40, 220);
		const first = makeStaveNote(stave, 30, { trill: true });
		const second = makeStaveNote(stave, 90);
		const third = makeStaveNote(stave, 150, { key: 'f/5' });
		const [line] = new WavyLineBuilder(connectors).build(
			chords,
			mapByLead(chords, [first, second, third]),
		);
		expect(line).toBeInstanceOf(TrillLine);
		expect((line as TrillLine).end).toEqual({
			kind: 'before-note',
			note: third,
		});
	});

	it('stops an untied cross-barline trill at the preceding barline when stop is beat 1 of the next bar', async () => {
		const { chords, connectors } =
			await buildFixture(`<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name/></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>16</duration><type>whole</type><notations><ornaments><trill-mark/><wavy-line type="start"/></ornaments></notations></note>
    </measure>
    <measure number="2">
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>16</duration><type>whole</type><notations><ornaments><wavy-line type="stop"/></ornaments></notations></note>
    </measure>
  </part>
</score-partwise>`);
		const stave1 = new Stave(0, 40, 140);
		const stave2 = new Stave(140, 40, 140);
		const first = makeStaveNote(stave1, 40, { key: 'd/5', trill: true });
		const second = makeStaveNote(stave2, 40, { key: 'c/5' });
		const [line] = new WavyLineBuilder(connectors).build(
			chords,
			mapByLead(chords, [first, second]),
		);
		expect(line).toBeInstanceOf(TrillLine);
		expect((line as TrillLine).end).toEqual({
			kind: 'barline',
			stave: stave1,
		});
	});

	it('starts after the tr sign and stops before a following accidental without overlapping either', () => {
		const stave = new Stave(0, 40, 220);
		const start = makeStaveNote(stave, 40, { trill: true });
		const stop = makeStaveNote(stave, 140, { key: 'f#/5', accidental: '#' });
		const trill = start
			.getModifiers()
			.find((m): m is StaveOrnament => m instanceof StaveOrnament && m.isTrill);
		const sharp = stop
			.getModifiers()
			.find((m): m is Accidental => m instanceof Accidental);
		if (!trill || !sharp) {
			throw new Error('expected trill and accidental modifiers');
		}
		const line = new TrillLine(start, stop, {
			kind: 'before-note',
			note: stop,
		});
		const { calls } = recordDrawnText(line);
		const drawn = calls[0];
		expect(calls).toHaveLength(1);
		if (!drawn) {
			throw new Error('expected drawn trill line text');
		}
		const trBox = trill.getBoundingBox();
		const sharpLeft = sharp.getInkBounds().getX();
		expect(drawn.x).toBeGreaterThan(trBox.getX() + trBox.getW());
		expect(drawn.x + drawn.text.length * 6).toBeLessThan(sharpLeft);
	});
});

interface StaveNoteOptions {
	key?: string;
	trill?: boolean;
	accidental?: string;
}

async function buildFixture(xml: string) {
	const document = await new DefaultScoreParser().parse(xml);
	const reader = new ScoreReader(new DynamicGlyphs());
	const connectors = new CurveConnectors(reader);
	const part = document.score.parts[0];
	if (!part) {
		throw new Error('missing part');
	}
	const chords = part.measures.flatMap((measure) => measure.chords);
	return { chords, connectors };
}

function mapByLead(chords: Chord[], notes: StaveNote[]): Map<Note, StaveNote> {
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

function makeStaveNote(
	stave: Stave,
	x: number,
	opts: StaveNoteOptions = {},
): StaveNote {
	const note = new StaveNote({
		keys: [opts.key ?? 'e/5'],
		duration: 'h',
	}).setStave(stave);
	if (opts.trill) {
		note.addModifier(new StaveOrnament('tr'));
	}
	if (opts.accidental) {
		note.addModifier(new Accidental(opts.accidental));
	}
	const mc = new ModifierContext();
	note.addToModifierContext(mc);
	mc.preFormat();
	new TickContext().addTickable(note).preFormat().setX(x);
	return note;
}

function recordDrawnText(line: TrillLine): {
	calls: Array<{ text: string; x: number; y: number }>;
} {
	const calls: Array<{ text: string; x: number; y: number }> = [];
	const ctx = {
		save() {},
		restore() {},
		setFont() {},
		measureText(text: string) {
			return {
				width: text.length * 6,
				actualBoundingBoxAscent: 3,
				actualBoundingBoxDescent: 3,
				actualBoundingBoxLeft: 0,
				actualBoundingBoxRight: text.length * 6,
			};
		},
		fillText(text: string, x: number, y: number) {
			calls.push({ text, x, y });
		},
	} as unknown as RenderContext;
	line.setContext(ctx).draw();
	return { calls };
}
