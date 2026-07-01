import { expect, test } from 'bun:test';
import { MDOMParser } from '@stringsync/mdom';
import { Rect } from './geometry';
import { buildTargets, type RawGeometry, type RawNote } from './hit';
import type {
	Bounded,
	Decorator,
	Note,
	TabPosition,
	Viewport,
} from './targets';

class FakeViewport implements Viewport {
	clientRectOf(rect: Rect): DOMRect {
		return { x: rect.x, y: rect.y, width: rect.w, height: rect.h } as DOMRect;
	}
	toScoreSpace(clientX: number, clientY: number): { x: number; y: number } {
		return { x: clientX, y: clientY };
	}
}

class FakeDecorator implements Decorator {
	setColor(): void {}
	setHalo(): void {}
	isColored(_target: Bounded): boolean {
		return false;
	}
	isHaloed(_target: Bounded): boolean {
		return false;
	}
}

const XML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>B</step><alter>-1</alter><octave>3</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;

function must<T>(value: T | undefined, what: string): T {
	if (value === undefined) {
		throw new Error(`missing ${what}`);
	}
	return value;
}

function build() {
	const mdoc = new MDOMParser().parseFromString(XML);
	const chords = must(
		mdoc.score.parts[0]?.measures[0]?.voices[0],
		'voice',
	).chords;
	const mC = must(chords[0]?.notes[0], 'C');
	const mE = must(chords[0]?.notes[1], 'E');
	const mBb = must(chords[1]?.notes[0], 'Bb');

	// C and E stack as a chord; Bb is a lone tab note (fret 3 on string 2).
	const notes: RawNote[] = [
		{
			mnote: mC,
			rect: new Rect(50, 40, 8, 8),
			chord: [mC, mE],
			measureIndex: 0,
			tab: null,
			glyph: null,
		},
		{
			mnote: mE,
			rect: new Rect(50, 50, 8, 8),
			chord: [mC, mE],
			measureIndex: 0,
			tab: null,
			glyph: null,
		},
		{
			mnote: mBb,
			rect: new Rect(90, 40, 6, 6),
			chord: [mBb],
			measureIndex: 0,
			tab: { string: 2, fret: 3 },
			glyph: null,
		},
	];
	const geometry: RawGeometry = {
		bounds: new Rect(0, 0, 200, 100),
		notes,
		measures: [{ rect: new Rect(0, 0, 200, 100), index: 0, number: '1' }],
	};
	return buildTargets(geometry, new FakeViewport(), new FakeDecorator())
		.hitTester;
}

test('a notehead beats the measure background under it', () => {
	const hit = build().hitTest({ x: 54, y: 44 });
	expect(hit?.type).toBe('note');
	expect((hit as Note).getPitch()).toBe('C/4');
});

test('empty staff space hits the measure', () => {
	const hit = build().hitTest({ x: 150, y: 80 });
	expect(hit?.type).toBe('measure');
});

test('hitTestAll returns every overlapping target, and [0] is the hitTest winner', () => {
	const tester = build();
	const all = tester.hitTestAll({ x: 54, y: 44 });
	expect(all.map((t) => t.type)).toEqual(['note', 'measure']); // notehead before its measure
	expect(all[0]).toBe(tester.hitTest({ x: 54, y: 44 }) ?? undefined);
});

test('hitTestWithin returns only targets fully inside the rect', () => {
	// Encloses the C+E chord but not the tab fret (x 90) or the full-page measure.
	const within = build().hitTestWithin(new Rect(45, 35, 20, 30));
	expect(within.map((t) => (t as Note).getPitch())).toEqual(['C/4', 'E/4']);
});

test('a chord stack resolves to the notehead under the point', () => {
	const tester = build();
	expect((tester.hitTest({ x: 54, y: 44 }) as Note).getPitch()).toBe('C/4');
	expect((tester.hitTest({ x: 54, y: 54 }) as Note).getPitch()).toBe('E/4');
});

test('a tab fret hits a TabPosition, not the note; both cross-link', () => {
	const hit = build().hitTest({ x: 92, y: 42 });
	expect(hit?.type).toBe('tab-position');
	const tab = hit as TabPosition;
	expect(tab.getString()).toBe(2);
	expect(tab.getFret()).toBe(3);
	const note = tab.getNote();
	expect(note.getPitch()).toBe('Bb/3');
	expect(note.getTabPosition()).toBe(tab);
});

test('a notation notehead has no tab position', () => {
	const note = build().hitTest({ x: 54, y: 44 }) as Note;
	expect(note.getTabPosition()).toBeNull();
});

test('chordmates are wired from the raw chord grouping', () => {
	const tester = build();
	const c = tester.hitTest({ x: 54, y: 44 }) as Note;
	const e = tester.hitTest({ x: 54, y: 54 }) as Note;
	expect(c.getChordSiblings({ includeSelf: false })).toEqual([e]);
	expect(c.isChordMember()).toBe(true);
});
