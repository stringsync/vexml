import { describe, expect, it } from 'bun:test';
import {
	MDocument,
	type Measure as MMeasure,
	type Note as MNote,
	type Part as MPart,
} from '@stringsync/mdom';
import { Rect } from 'webappwiz/geometry';
import { isHighlightable, isPlayable } from './element';
import { FakeDecorations } from './fake-decorations';
import { FakeViewport } from './fake-viewport';
import { Measure } from './measure';
import { MeasureBox } from './measure-box';
import { Note } from './note';
import { Part } from './part';
import { System } from './system';
import { TabPosition } from './tab-position';
import type { Viewport } from './viewport';

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

/* One part, one measure, one note: the smallest score a TabPosition can point back at. */
function fixture() {
	const mpart = MDocument.empty().score.addPart({ id: 'P1', name: 'M' });
	const mmeasure = mpart.addMeasure();
	const mnote = mmeasure
		.getOrCreateVoice('1')
		.addNote({ step: 'C', octave: 4, type: 'quarter' });
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
