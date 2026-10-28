import { describe, expect, it } from 'bun:test';
import { MDocument, type Note } from '@stringsync/mdom';
import { Rect } from 'webappwiz/geometry';
import { editingCaretRect } from './editing-caret';
import { ElementFactory } from './element-factory';
import { FakeDecorations } from './fake-decorations';
import { FakeViewport } from './fake-viewport';

describe('editingCaretRect', () => {
	it('aligns onsets across staves and draws on the requested staff', () => {
		const { part, firstMeasure, index } = fixture();
		expect(
			editingCaretRect(index, {
				part,
				measure: firstMeasure,
				voice: '2',
				staff: 2,
				onset: 0.5,
			}),
		).toEqual(new Rect(50, 120, 0, 40));
	});

	it('resolves an empty measure on a wrapped system without adding a rest', () => {
		const { part, empty, index } = fixture();
		const target = { part, measure: empty, voice: '1', staff: 2 };
		expect(editingCaretRect(index, { ...target, onset: 0 })).toEqual(
			new Rect(20, 370, 0, 40),
		);
		expect(editingCaretRect(index, { ...target, onset: 4 })).toEqual(
			new Rect(200, 370, 0, 40),
		);
		expect(empty.notes).toEqual([]);
	});

	it('returns null when the target staff has no render geometry', () => {
		const { part, firstMeasure, index } = fixture();
		expect(
			editingCaretRect(index, {
				part,
				measure: firstMeasure,
				voice: '1',
				staff: 3,
				onset: 0,
			}),
		).toBeNull();
	});
});

function fixture() {
	const document = MDocument.empty();
	const part = document.score.addPart();
	const firstMeasure = part.addMeasure();
	firstMeasure.setStaveCount(2);
	const first = firstMeasure
		.getOrCreateVoice('1')
		.addNote({ step: 'C', octave: 4, type: 'quarter' });
	const second = firstMeasure
		.getOrCreateVoice('1')
		.addNote({ step: 'D', octave: 4, type: 'quarter' });
	const lower = firstMeasure
		.getOrCreateVoice('2', { staff: '2' })
		.addNote({ step: 'E', octave: 3, type: 'quarter' });
	const empty = part.addMeasure();
	const staves = (top: number, noteStartX: number) => [
		{
			part: part.id,
			staff: 1,
			lines: [top, top + 10, top + 20, top + 30, top + 40],
			left: 0,
			right: 200,
			noteStartX,
		},
		{
			part: part.id,
			staff: 2,
			lines: [top + 80, top + 90, top + 100, top + 110, top + 120],
			left: 0,
			right: 200,
			noteStartX,
		},
	];
	const note = (mnote: Note, x: number) => ({
		mnote,
		rect: new Rect(x, 40, 8, 8),
		ink: new Rect(x, 40, 8, 8),
		chord: [mnote],
		measureIndex: 0,
		tab: null,
		glyph: null,
	});
	const factory = new ElementFactory();
	const index = factory.build(
		factory.model(
			{
				bounds: new Rect(0, 0, 200, 450),
				measures: [
					{
						rect: new Rect(0, 0, 200, 200),
						index: 0,
						number: '1',
						systemIndex: 0,
						staves: staves(40, 10),
						barlines: [],
					},
					{
						rect: new Rect(0, 250, 200, 200),
						index: 1,
						number: '2',
						systemIndex: 1,
						staves: staves(290, 20),
						barlines: [],
					},
				],
				notes: [note(first, 20), note(second, 80), note(lower, 20)],
				chordDiagrams: [],
			},
			document.score.parts,
		),
		new FakeViewport(),
		new FakeDecorations(),
	);
	return { part, firstMeasure, empty, index };
}
