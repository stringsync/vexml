import { expect, test } from 'bun:test';
import { MDOMParser, type Note as MNote } from '@stringsync/mdom';
import { Rect } from './geometry';
import {
	type Bounded,
	type Decorator,
	Measure,
	Note,
	TabPosition,
	type Viewport,
} from './targets';

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

class FakeDecorator implements Decorator {
	readonly colors = new Map<Bounded, string>();
	readonly halos = new Set<Bounded>();
	setColor(target: Bounded, color: string | null): void {
		if (color === null) {
			this.colors.delete(target);
		} else {
			this.colors.set(target, color);
		}
	}
	setHalo(target: Bounded, on: boolean): void {
		if (on) {
			this.halos.add(target);
		} else {
			this.halos.delete(target);
		}
	}
	isColored(target: Bounded): boolean {
		return this.colors.has(target);
	}
	isHaloed(target: Bounded): boolean {
		return this.halos.has(target);
	}
}

const XML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
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
	const voice = must(mdoc.score.parts[0]?.measures[0]?.voices[0], 'voice');
	const chords = voice.chords;
	const mC = must(chords[0]?.notes[0], 'C');
	const mE = must(chords[0]?.notes[1], 'E');
	const mRest = must(chords[1]?.notes[0], 'rest');
	const mBb = must(chords[2]?.notes[0], 'Bb');

	const viewport = new FakeViewport();
	const decorator = new FakeDecorator();
	const measure = new Measure(new Rect(0, 0, 100, 50), viewport);

	// The shared registries the wrappers resolve their cross-links through (a Map fulfills the
	// NoteLookup / TabLookup interfaces). Populated as each note is built.
	const notesByMnote = new Map<MNote, Note>();
	const tabsByMnote = new Map<MNote, TabPosition>();
	const base = (mnote: MNote, rect: Rect, chord: MNote[]): Note => {
		const note = new Note({
			mnote,
			rect,
			viewport,
			decorator,
			measure,
			chord,
			notes: notesByMnote,
			tabs: tabsByMnote,
		});
		notesByMnote.set(mnote, note);
		return note;
	};

	// Chord [C4, E4], then a rest, then Bb3 (each its own solo chord).
	const noteC = base(mC, new Rect(10, 10, 8, 8), [mC, mE]);
	const noteE = base(mE, new Rect(10, 18, 8, 8), [mC, mE]);
	const noteRest = base(mRest, new Rect(20, 10, 8, 8), [mRest]);
	const noteBb = base(mBb, new Rect(30, 10, 8, 8), [mBb]);

	return { viewport, decorator, measure, noteC, noteE, noteRest, noteBb };
}

test('getPitch formats vexflow keys and returns null for rests', () => {
	const { noteC, noteE, noteRest, noteBb } = fixture();
	expect(noteC.getPitch()).toBe('C/4');
	expect(noteE.getPitch()).toBe('E/4');
	expect(noteRest.getPitch()).toBeNull();
	expect(noteBb.getPitch()).toBe('Bb/3');
});

test('getBeats and isGrace read the underlying note', () => {
	const { noteC } = fixture();
	expect(noteC.getBeats()).toBe(1);
	expect(noteC.isGrace()).toBe(false);
});

test('chord membership and siblings', () => {
	const { noteC, noteE, noteBb } = fixture();
	expect(noteC.isChordMember()).toBe(true);
	expect(noteBb.isChordMember()).toBe(false);
	expect(noteC.getChordSiblings({ includeSelf: false })).toEqual([noteE]);
	expect(noteC.getChordSiblings({ includeSelf: true })).toEqual([noteC, noteE]);
});

test('getMeasure and getTabPosition return the linked objects', () => {
	const { noteC, measure } = fixture();
	expect(noteC.getMeasure()).toBe(measure);
	expect(noteC.getTabPosition()).toBeNull();
});

test('color toggle delegates to the decorator and reflects active state', () => {
	const { noteC, decorator } = fixture();
	expect(noteC.color.active).toBe(false);
	noteC.color.on('#2962ff');
	expect(decorator.colors.get(noteC)).toBe('#2962ff');
	expect(noteC.color.active).toBe(true);
	noteC.color.off();
	expect(decorator.colors.has(noteC)).toBe(false);
	expect(noteC.color.active).toBe(false);
});

test('halo toggle delegates to the decorator', () => {
	const { noteC, decorator } = fixture();
	noteC.halo.on();
	expect(decorator.halos.has(noteC)).toBe(true);
	expect(noteC.halo.active).toBe(true);
	noteC.halo.off();
	expect(noteC.halo.active).toBe(false);
});

test('getBoundingClientRect maps the score-space rect through the viewport', () => {
	const { noteC } = fixture();
	const r = noteC.getBoundingClientRect();
	expect([r.x, r.y, r.width, r.height]).toEqual([10, 10, 8, 8]);
});

test('TabPosition exposes string/fret and links back to its note', () => {
	const { noteC, viewport } = fixture();
	const tab = new TabPosition(new Rect(0, 0, 6, 6), viewport, {
		string: 3,
		fret: 5,
		note: noteC,
	});
	expect(tab.getString()).toBe(3);
	expect(tab.getFret()).toBe(5);
	expect(tab.getNote()).toBe(noteC);
	expect(tab.type).toBe('tab-position');
});
