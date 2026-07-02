import { describe, expect, it } from 'bun:test';
import { MDOMParser, MElement } from '@stringsync/mdom';
import type { RawGeometry, RawNote } from '../engraving/score-drawer';
import { Rect } from '../geometry';
import { FakeDecoration } from '../testing/fake-decoration';
import { FakeViewport } from '../testing/fake-viewport';
import { ElementFactory } from './element-factory';
import type { Note } from './note';
import type { TabPosition } from './tab-position';

const XML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <harmony><root><root-step>C</root-step></root><kind>major</kind><frame>
        <frame-strings>6</frame-strings><frame-frets>4</frame-frets>
        <frame-note><string>5</string><fret>3</fret></frame-note>
      </frame></harmony>
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
	const parts = mdoc.score.parts;
	const mmeasure = must(parts[0]?.measures[0], 'measure');
	const chords = must(mmeasure.voices[0], 'voice').chords;
	const mC = must(chords[0]?.notes[0], 'C');
	const mE = must(chords[0]?.notes[1], 'E');
	const mBb = must(chords[1]?.notes[0], 'Bb');
	const harmony = must(
		mmeasure.children.find(
			(c): c is MElement => c instanceof MElement && c.tag === 'harmony',
		),
		'harmony',
	);

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
		measures: [
			{ rect: new Rect(0, 0, 200, 100), index: 0, number: '1', systemIndex: 0 },
		],
		chordDiagrams: [
			{
				rect: new Rect(40, 5, 75, 30),
				harmonySource: harmony,
				measureIndex: 0,
				frame: { chord: [[5, 3]] },
				title: 'C',
			},
		],
	};
	return {
		index: new ElementFactory().build(geometry, parts, new FakeViewport(), {
			color: new FakeDecoration(),
			halo: new FakeDecoration(),
		}),
		mmeasure,
		mC,
		harmony,
	};
}

describe('ElementFactory', () => {
	it('a notehead beats the measure background under it', () => {
		const hit = build().index.at({ x: 54, y: 44 });
		expect(hit?.type).toBe('note');
		expect((hit as Note).getPitch()).toBe('C/4');
	});

	it('empty staff space hits the measure', () => {
		const hit = build().index.at({ x: 150, y: 80 });
		expect(hit?.type).toBe('measure');
	});

	it('allAt returns every overlapping element, and [0] is the at() winner', () => {
		const { index } = build();
		const all = index.allAt({ x: 54, y: 44 });
		expect(all.map((t) => t.type)).toEqual(['note', 'measure']); // notehead before its measure
		expect(all[0]).toBe(index.at({ x: 54, y: 44 }) ?? undefined);
	});

	it('within returns only elements fully inside the rect', () => {
		// Encloses the C+E chord but not the tab fret (x 90) or the full-page measure.
		const within = build().index.within(new Rect(45, 35, 20, 30));
		expect(within.map((t) => (t as Note).getPitch())).toEqual(['C/4', 'E/4']);
	});

	it('a chord stack resolves to the notehead under the point', () => {
		const { index } = build();
		expect((index.at({ x: 54, y: 44 }) as Note).getPitch()).toBe('C/4');
		expect((index.at({ x: 54, y: 54 }) as Note).getPitch()).toBe('E/4');
	});

	it('a tab fret hits a TabPosition, not the note; both cross-link', () => {
		const hit = build().index.at({ x: 92, y: 42 });
		expect(hit?.type).toBe('tab-position');
		const tab = hit as TabPosition;
		expect(tab.getString()).toBe(2);
		expect(tab.getFret()).toBe(3);
		const note = tab.getNote();
		expect(note.getPitch()).toBe('Bb/3');
		expect(note.getTabPosition()).toBe(tab);
	});

	it('a notation notehead has no tab position', () => {
		const note = build().index.at({ x: 54, y: 44 }) as Note;
		expect(note.getTabPosition()).toBeNull();
	});

	it('chordmates are wired from the raw chord grouping', () => {
		const { index } = build();
		const c = index.at({ x: 54, y: 44 }) as Note;
		const e = index.at({ x: 54, y: 54 }) as Note;
		expect(c.getChordSiblings({ includeSelf: false })).toEqual([e]);
		expect(c.isChordMember()).toBe(true);
	});

	it('noteLookup keys the same identities enumeration and hit-testing return', () => {
		const { index, mC } = build();
		const noteC = must(index.noteLookup.get(mC), 'noteC');
		expect(noteC).toBe(index.at({ x: 54, y: 44 }) as Note);
		expect(index.notes()).toContain(noteC);
	});

	it('measure boxes carry mdom provenance, one source per part', () => {
		const { index, mmeasure } = build();
		const box = must(index.measureBoxes()[0], 'box');
		expect(box.getSources()).toEqual([mmeasure]);
	});

	it('the musical axis reaches the same Note identities hit-testing returns', () => {
		const { index } = build();
		const part = must(index.parts()[0], 'part');
		expect(part.getId()).toBe('P1');
		expect(part.getLabel()).toBe('M');
		const measure = must(part.getMeasures()[0], 'measure');
		const voice = must(measure.getVoices()[0], 'voice');
		expect(voice.getStave()).toBe(1);
		// C, E, Bb in document order — the very objects the pointer tree returns.
		expect(voice.getNotes().map((n) => n.getPitch())).toEqual([
			'C/4',
			'E/4',
			'Bb/3',
		]);
		expect(voice.getNotes()[0]).toBe(index.at({ x: 54, y: 44 }) as Note);
	});

	it('the axes join at the measure: box <-> measure <-> system all cross-link', () => {
		const { index, mmeasure } = build();
		const box = must(index.measureBoxes()[0], 'box');
		const system = must(index.systems()[0], 'system');
		const measure = must(index.parts()[0]?.getMeasures()[0], 'measure');

		expect(measure.getBox()).toBe(box);
		expect(measure.getSources()).toEqual([mmeasure]);
		expect(box.getMeasures()).toEqual([measure]);
		expect(box.getSystem()).toBe(system);
		expect(system.getIndex()).toBe(0);
		expect(system.getMeasureBoxes()).toEqual([box]);
		// One system, one column: the system rect is that column's rect.
		expect(system.rect).toEqual(box.rect);

		const note = index.at({ x: 54, y: 44 }) as Note;
		expect(note.getMeasure()).toBe(measure);
		expect(note.getMeasure().getPart()).toBe(must(index.parts()[0], 'part'));
	});

	it('chord diagrams are indexed but not hit-testable in v1', () => {
		const { index, harmony } = build();
		const diagrams = index.chordDiagrams();
		expect(diagrams).toHaveLength(1);
		const diagram = must(diagrams[0], 'diagram');
		expect(diagram.getTitle()).toBe('C');
		expect(diagram.getSources()).toEqual([harmony]);
		// Its box covers (50, 10), but the pointer tree doesn't contain it — the measure wins.
		expect(index.at({ x: 50, y: 10 })?.type).toBe('measure');
	});
});
