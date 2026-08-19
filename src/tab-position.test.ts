import { describe, expect, it } from 'bun:test';
import {
	MDOMParser,
	type Measure as MMeasure,
	type Note as MNote,
	type Part as MPart,
} from '@stringsync/mdom';
import { FakeDecorations } from './decoration/fake-decorations';
import { isHighlightable, isPlayable } from './element';
import { Rect } from './geometry';
import { Measure } from './measure';
import { MeasureBox } from './measure-box';
import { Note } from './note';
import { Part } from './part';
import { System } from './system';
import { TabPosition } from './tab-position';
import { FakeViewport } from './viewport/fake-viewport';
import type { Viewport } from './viewport/viewport';

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

/* Any Measure at all: Note stores one and hands it back, and nothing here reads it. Its
 * back-reference arrays stay empty — measure.test.ts is what covers the linking. */
function bareMeasure(
	mpart: MPart,
	mmeasure: MMeasure,
	viewport: Viewport,
): Measure {
	const rect = new Rect(0, 0, 100, 50);
	const box = new MeasureBox(
		rect,
		viewport,
		mmeasure.number,
		mmeasure.index,
		[mmeasure],
		new System(rect, viewport, 0, []),
		[],
	);
	return new Measure(mmeasure, new Part(mpart, []), box, []);
}

function fixture() {
	const mdoc = new MDOMParser().parseFromString(XML);
	const mpart = mdoc.score.parts[0];
	const mmeasure = mpart?.measures[0];
	const mnote = mmeasure?.notes[0];
	if (!mpart || !mmeasure || !mnote) {
		throw new Error('fixture: missing note');
	}
	const viewport = new FakeViewport();
	const decorations = new FakeDecorations();
	const measure = bareMeasure(mpart, mmeasure, viewport);
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

	// A tie-stop/held string omits its fret number (glyph null); coloring it must not stamp a
	// phantom ellipse blip on the empty string.
	it('draws nothing when no fret glyph was engraved', () => {
		const { tab } = fixture();
		let draws = 0;
		const ctx = new Proxy(
			{},
			{
				get: () => () => {
					draws++;
				},
				set: () => true,
			},
		) as unknown as CanvasRenderingContext2D;
		tab.drawColor(ctx, 'red');
		expect(draws).toBe(0);
	});
});
