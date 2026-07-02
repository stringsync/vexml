import { describe, expect, it } from 'bun:test';
import { MDOMParser, type Note as MNote } from '@stringsync/mdom';
import { Rect } from '../geometry';
import type { Viewport } from '../host/stage';
import {
	type Decoratable,
	type Decoration,
	isHighlightable,
	isPlayable,
} from './element';
import { Measure } from './measure';
import { Note } from './note';
import type { TabPosition } from './tab-position';

// Separate fake classes that fulfill the injected interfaces (preferred over mocks).

class FakeViewport implements Viewport {
	clientRectOf(rect: Rect): DOMRect {
		// bun's runtime has no DOMRect; a structural literal is enough for unit reads.
		return {
			x: rect.x,
			y: rect.y,
			width: rect.w,
			height: rect.h,
			top: rect.y,
			left: rect.x,
			right: rect.right,
			bottom: rect.bottom,
			toJSON: () => ({}),
		} as DOMRect;
	}
	toScoreSpace(clientX: number, clientY: number): { x: number; y: number } {
		return { x: clientX, y: clientY };
	}
}

class FakeDecoration implements Decoration {
	readonly active = new Map<Decoratable, string>();
	set(target: Decoratable, color: string | null): void {
		if (color === null) {
			this.active.delete(target);
		} else {
			this.active.set(target, color);
		}
	}
	has(target: Decoratable): boolean {
		return this.active.has(target);
	}
}

const XML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type>
        <notations><articulations><staccato/></articulations></notations>
      </note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><rest/><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>B</step><alter>-1</alter><octave>3</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;

function must<T>(value: T | undefined, what: string): T {
	if (value === undefined) {
		throw new Error(`fixture: missing ${what}`);
	}
	return value;
}

function fixture() {
	const mdoc = new MDOMParser().parseFromString(XML);
	const mmeasure = must(mdoc.score.parts[0]?.measures[0], 'measure');
	const voice = must(mmeasure.voices[0], 'voice');
	const chords = voice.chords;
	const mC = must(chords[0]?.notes[0], 'C');
	const mE = must(chords[0]?.notes[1], 'E');
	const mRest = must(chords[1]?.notes[0], 'rest');
	const mBb = must(chords[2]?.notes[0], 'Bb');

	const viewport = new FakeViewport();
	const decorations = {
		color: new FakeDecoration(),
		halo: new FakeDecoration(),
	};
	const measure = new Measure(new Rect(0, 0, 100, 50), viewport, '1', 0, [
		mmeasure,
	]);

	// The shared registries the wrappers resolve their cross-links through (a Map fulfills the
	// NoteLookup / TabLookup interfaces). Populated as each note is built.
	const notesByMnote = new Map<MNote, Note>();
	const tabsByMnote = new Map<MNote, TabPosition>();
	const base = (mnote: MNote, rect: Rect, chord: MNote[]): Note => {
		const note = new Note({
			mnote,
			rect,
			viewport,
			decorations,
			measure,
			chord,
			notes: notesByMnote,
			tabs: tabsByMnote,
			glyph: null,
		});
		notesByMnote.set(mnote, note);
		return note;
	};

	// Chord [C4, E4], then a rest, then Bb3 (each its own solo chord).
	const noteC = base(mC, new Rect(10, 10, 8, 8), [mC, mE]);
	const noteE = base(mE, new Rect(10, 18, 8, 8), [mC, mE]);
	const noteRest = base(mRest, new Rect(20, 10, 8, 8), [mRest]);
	const noteBb = base(mBb, new Rect(30, 10, 8, 8), [mBb]);

	return { viewport, decorations, measure, mC, noteC, noteE, noteRest, noteBb };
}

describe('Note', () => {
	it('getPitch formats vexflow keys and returns null for rests', () => {
		const { noteC, noteE, noteRest, noteBb } = fixture();
		expect(noteC.getPitch()).toBe('C/4');
		expect(noteE.getPitch()).toBe('E/4');
		expect(noteRest.getPitch()).toBeNull();
		expect(noteBb.getPitch()).toBe('Bb/3');
	});

	it('getDurationBeats and isGrace read the underlying note', () => {
		const { noteC } = fixture();
		expect(noteC.getDurationBeats()).toBe(1);
		expect(noteC.isGrace()).toBe(false);
	});

	it('getArticulations reads the notation markings', () => {
		const { noteC, noteE } = fixture();
		expect(noteC.getArticulations()).toEqual(['staccato']);
		expect(noteE.getArticulations()).toEqual([]);
	});

	it('getSources returns the underlying mdom note', () => {
		const { noteC, mC } = fixture();
		expect(noteC.getSources()).toEqual([mC]);
	});

	it('is highlightable and playable', () => {
		const { noteC } = fixture();
		expect(isHighlightable(noteC)).toBe(true);
		expect(isPlayable(noteC)).toBe(true);
	});

	it('chord membership and siblings', () => {
		const { noteC, noteE, noteBb } = fixture();
		expect(noteC.isChordMember()).toBe(true);
		expect(noteBb.isChordMember()).toBe(false);
		expect(noteC.getChordSiblings({ includeSelf: false })).toEqual([noteE]);
		expect(noteC.getChordSiblings({ includeSelf: true })).toEqual([
			noteC,
			noteE,
		]);
	});

	it('getMeasure and getTabPosition return the linked objects', () => {
		const { noteC, measure } = fixture();
		expect(noteC.getMeasure()).toBe(measure);
		expect(noteC.getTabPosition()).toBeNull();
	});

	it('color toggle delegates to its decoration and reflects active state', () => {
		const { noteC, decorations } = fixture();
		expect(noteC.color.active).toBe(false);
		noteC.color.on('#2962ff');
		expect(decorations.color.active.get(noteC)).toBe('#2962ff');
		expect(noteC.color.active).toBe(true);
		noteC.color.off();
		expect(decorations.color.active.has(noteC)).toBe(false);
		expect(noteC.color.active).toBe(false);
	});

	it('halo toggle delegates to its decoration and carries its color', () => {
		const { noteC, decorations } = fixture();
		noteC.halo.on('#2962ff');
		expect(decorations.halo.active.get(noteC)).toBe('#2962ff');
		expect(noteC.halo.active).toBe(true);
		noteC.halo.off();
		expect(decorations.halo.active.has(noteC)).toBe(false);
		expect(noteC.halo.active).toBe(false);
	});

	it('getBoundingClientRect maps the score-space rect through the viewport', () => {
		const { noteC } = fixture();
		const r = noteC.getBoundingClientRect();
		expect([r.x, r.y, r.width, r.height]).toEqual([10, 10, 8, 8]);
	});

	it('getGraceNotes returns the grace run immediately preceding a note', () => {
		const xml = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <note><grace/><pitch><step>F</step><octave>4</octave></pitch><type>eighth</type></note>
      <note><grace/><pitch><step>G</step><octave>4</octave></pitch><type>eighth</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;
		const mdoc = new MDOMParser().parseFromString(xml);
		const mmeasure = must(mdoc.score.parts[0]?.measures[0], 'measure');
		const [mF, mG, mA, mB] = mmeasure.notes;

		const viewport = new FakeViewport();
		const decorations = {
			color: new FakeDecoration(),
			halo: new FakeDecoration(),
		};
		const measure = new Measure(new Rect(0, 0, 100, 50), viewport, '1', 0, [
			mmeasure,
		]);
		const notesByMnote = new Map<MNote, Note>();
		const build = (mnote: MNote) => {
			const note = new Note({
				mnote,
				rect: new Rect(0, 0, 8, 8),
				viewport,
				decorations,
				measure,
				chord: [mnote],
				notes: notesByMnote,
				tabs: new Map(),
				glyph: null,
			});
			notesByMnote.set(mnote, note);
			return note;
		};
		const graceF = build(must(mF, 'F'));
		const graceG = build(must(mG, 'G'));
		const noteA = build(must(mA, 'A'));
		const noteB = build(must(mB, 'B'));

		// A's graces are the two grace notes before it, in play order; B (a plain note) has none.
		expect(noteA.getGraceNotes()).toEqual([graceF, graceG]);
		expect(noteB.getGraceNotes()).toEqual([]);
	});
});
