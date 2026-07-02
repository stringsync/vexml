import { describe, expect, it } from 'bun:test';
import { MDOMParser, type Note as MNote } from '@stringsync/mdom';
import { Rect } from '../geometry';
import { FakeDecoration } from '../testing/fake-decoration';
import { FakeViewport } from '../testing/fake-viewport';
import { isHighlightable, isPlayable } from './element';
import { Measure } from './measure';
import { Note } from './note';
import { TabPosition } from './tab-position';

const XML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;

function fixture() {
	const mdoc = new MDOMParser().parseFromString(XML);
	const mmeasure = mdoc.score.parts[0]?.measures[0];
	const mnote = mmeasure?.notes[0];
	if (!mmeasure || !mnote) {
		throw new Error('fixture: missing note');
	}
	const viewport = new FakeViewport();
	const decorations = {
		color: new FakeDecoration(),
		halo: new FakeDecoration(),
	};
	const measure = new Measure(new Rect(0, 0, 100, 50), viewport, '1', 0, [
		mmeasure,
	]);
	const notesByMnote = new Map<MNote, Note>();
	const note = new Note({
		mnote,
		rect: new Rect(10, 10, 8, 8),
		viewport,
		decorations,
		measure,
		chord: [mnote],
		notes: notesByMnote,
		tabs: new Map(),
		glyph: null,
	});
	notesByMnote.set(mnote, note);
	const tab = new TabPosition(new Rect(0, 0, 6, 6), viewport, {
		string: 3,
		fret: 5,
		note,
		decorations,
		glyph: null,
	});
	return { note, tab, mnote };
}

describe('TabPosition', () => {
	it('exposes string/fret and links back to its note', () => {
		const { note, tab } = fixture();
		expect(tab.getString()).toBe(3);
		expect(tab.getFret()).toBe(5);
		expect(tab.getNote()).toBe(note);
		expect(tab.type).toBe('tab-position');
	});

	it('getSources shares the note it renders', () => {
		const { note, tab, mnote } = fixture();
		expect(tab.getSources()).toEqual([mnote]);
		expect(tab.getSources()).toEqual(note.getSources());
	});

	it('is highlightable but not playable', () => {
		const { tab } = fixture();
		expect(isHighlightable(tab)).toBe(true);
		expect(isPlayable(tab)).toBe(false);
	});
});
