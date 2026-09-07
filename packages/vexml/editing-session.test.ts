import { describe, expect, it } from 'bun:test';
import { MDocument, MElement, type Note } from '@stringsync/mdom';
import { EditingSession } from './editing-session';

function required<T>(value: T | null | undefined, name: string): T {
	if (value == null) {
		throw new Error(`missing ${name}`);
	}
	return value;
}

function createDocument(steps: readonly string[]): MDocument {
	const document = MDocument.empty();
	const voice = document.score.addPart().addMeasure().getOrCreateVoice('1');
	for (const step of steps) {
		voice.addNote({ step, octave: 4, type: 'quarter' });
	}
	return document;
}

function noteAt(document: MDocument, index: number): Note {
	return required(
		document.score.parts[0]?.measures[0]?.notes[index],
		'test note',
	);
}

describe('EditingSession', () => {
	it('starts without a selection and safely navigates an empty document', () => {
		const session = new EditingSession(MDocument.empty());
		expect(session.getFocus()).toBeNull();
		expect(session.getSelection()).toEqual([]);
		expect(session.move('next')).toBe(false);
		expect(session.move('previous')).toBe(false);
		expect(session.move('higher')).toBe(false);
		expect(session.undo()).toBe(false);
		expect(session.redo()).toBe(false);
		expect(session.setPitch({ step: 'D', octave: 4 })).toBe(false);
	});

	it('starts at the first written note and clamps at both boundaries', () => {
		const document = createDocument(['C', 'D']);
		const session = new EditingSession(document);
		expect(session.move('next')).toBe(true);
		expect(session.getFocus()).toBe(noteAt(document, 0));
		expect(session.move('previous')).toBe(false);
		expect(session.move('next')).toBe(true);
		expect(session.getSelection()).toEqual([noteAt(document, 1)]);
		expect(session.move('next')).toBe(false);
		expect(session.getFocus()).toBe(noteAt(document, 1));
	});

	it('previous from an unset cursor starts at the last written note', () => {
		const document = createDocument(['C', 'D']);
		const session = new EditingSession(document);
		session.move('previous');
		expect(session.getFocus()).toBe(noteAt(document, 1));
	});

	it('extends, shrinks and reverses a range around its original anchor', () => {
		const document = createDocument(['C', 'D', 'E', 'F']);
		const session = new EditingSession(document);
		session.select(noteAt(document, 1));
		session.move('next', { extend: true });
		session.move('next', { extend: true });
		expect(session.getSelection()).toEqual([
			noteAt(document, 1),
			noteAt(document, 2),
			noteAt(document, 3),
		]);
		session.move('previous', { extend: true });
		session.move('previous', { extend: true });
		expect(session.getSelection()).toEqual([noteAt(document, 1)]);
		session.move('previous', { extend: true });
		expect(session.getSelection()).toEqual([
			noteAt(document, 0),
			noteAt(document, 1),
		]);
		expect(session.getFocus()).toBe(noteAt(document, 0));
	});

	it('a normal selection resets the range anchor', () => {
		const document = createDocument(['C', 'D', 'E', 'F']);
		const session = new EditingSession(document);
		session.select(noteAt(document, 0));
		session.select(noteAt(document, 3), { extend: true });
		session.select(noteAt(document, 2));
		session.move('next', { extend: true });
		expect(session.getSelection()).toEqual([
			noteAt(document, 2),
			noteAt(document, 3),
		]);
	});

	it('crosses empty measures and staves within its voice without entering another voice', () => {
		const document = createDocument(['C']);
		const part = required(document.score.parts[0], 'part');
		const first = required(part.measures[0], 'measure');
		first
			.getOrCreateVoice('2')
			.addNote({ step: 'G', octave: 3, type: 'quarter' });
		part.addMeasure();
		const last = part
			.addMeasure()
			.getOrCreateVoice('1', { staff: '2' })
			.addNote({ step: 'D', octave: 4, type: 'quarter' });
		const session = new EditingSession(document);
		session.select(noteAt(document, 0));
		session.move('next', { extend: true });
		expect(session.getFocus()).toBe(last);
		expect(session.getSelection()).toEqual([noteAt(document, 0), last]);
		session.move('previous');
		expect(session.getFocus()).toBe(noteAt(document, 0));
	});

	it('visits grace notes, rests and hidden notes as individual written targets', () => {
		const document = createDocument(['C', 'D', 'E']);
		noteAt(document, 0).convertToGrace();
		noteAt(document, 1).convertToRest();
		noteAt(document, 2).setAttribute('print-object', 'no');
		const session = new EditingSession(document);
		for (let index = 0; index < 3; index++) {
			expect(session.move('next')).toBe(true);
			expect(session.getFocus()).toBe(noteAt(document, index));
		}
	});

	it.each([0, 1, 2])('moves horizontally past chord member %i', (member) => {
		const document = MDocument.empty();
		const voice = document.score.addPart().addMeasure().getOrCreateVoice('1');
		const first = voice.addChord(
			[
				{ step: 'C', octave: 4 },
				{ step: 'E', octave: 4 },
				{ step: 'G', octave: 4 },
			],
			{ type: 'quarter' },
		);
		const second = voice.addChord(
			[
				{ step: 'D', octave: 4 },
				{ step: 'F', octave: 4 },
				{ step: 'A', octave: 4 },
			],
			{ type: 'quarter' },
		);
		const session = new EditingSession(document);
		session.select(required(first.notes[member], 'first chord member'));
		expect(session.move('next')).toBe(true);
		expect(session.getSelection()).toEqual([second.lead]);
		const secondMember = required(second.notes[member], 'second chord member');
		session.select(secondMember);
		expect(session.move('next')).toBe(false);
		expect(session.getFocus()).toBe(secondMember);
		expect(session.move('previous')).toBe(true);
		expect(session.getSelection()).toEqual([first.lead]);
	});

	it('starts backwards on the final chord lead', () => {
		const document = MDocument.empty();
		const voice = document.score.addPart().addMeasure().getOrCreateVoice('1');
		const chord = voice.addChord(
			[
				{ step: 'C', octave: 4 },
				{ step: 'E', octave: 4 },
			],
			{ type: 'quarter' },
		);
		const session = new EditingSession(document);
		expect(session.move('previous')).toBe(true);
		expect(session.getFocus()).toBe(chord.lead);
	});

	it('keeps a grace chord separate from the following note at the same beat', () => {
		const document = MDocument.empty();
		const voice = document.score.addPart().addMeasure().getOrCreateVoice('1');
		const chord = voice.addChord(
			[
				{ step: 'C', octave: 4 },
				{ step: 'E', octave: 4 },
			],
			{ type: 'eighth' },
		);
		chord.lead.convertToGrace();
		const upper = required(chord.notes[1], 'upper grace note');
		upper.convertToGrace();
		const following = voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
		const session = new EditingSession(document);
		session.select(upper);
		expect(session.move('next')).toBe(true);
		expect(session.getFocus()).toBe(following);
		expect(session.move('previous')).toBe(true);
		expect(session.getFocus()).toBe(chord.lead);
	});

	it('moves vertically by chord pitch even when XML stores pitches in another order', () => {
		const document = MDocument.empty();
		const voice = document.score.addPart().addMeasure().getOrCreateVoice('1');
		const chord = voice.addChord(
			[
				{ step: 'G', octave: 4 },
				{ step: 'C', octave: 4 },
				{ step: 'E', octave: 4 },
			],
			{ type: 'quarter' },
		);
		const g = required(chord.notes[0], 'G');
		const c = required(chord.notes[1], 'C');
		const e = required(chord.notes[2], 'E');
		const session = new EditingSession(document);
		session.select(c);
		expect(session.move('lower')).toBe(false);
		session.move('higher');
		expect(session.getFocus()).toBe(e);
		session.move('higher');
		expect(session.getFocus()).toBe(g);
		expect(session.move('higher')).toBe(false);
		session.move('lower');
		expect(session.getFocus()).toBe(e);
	});

	it('does not turn a rest into a vertical pitch target', () => {
		const document = createDocument(['C']);
		noteAt(document, 0).convertToRest();
		const session = new EditingSession(document);
		session.select(noteAt(document, 0));
		expect(session.move('higher')).toBe(false);
		expect(session.move('lower')).toBe(false);
	});

	it('does not follow a repeat into a second playback occurrence', () => {
		const document = createDocument(['C', 'D']);
		const measure = required(document.score.parts[0]?.measures[0], 'measure');
		const barline = new MElement('barline');
		const repeat = new MElement('repeat');
		repeat.setAttribute('direction', 'backward');
		barline.append(repeat);
		measure.append(barline);
		const session = new EditingSession(document);
		session.select(noteAt(document, 1));
		expect(session.move('next')).toBe(false);
		expect(session.getFocus()).toBe(noteAt(document, 1));
	});

	it('deduplicates explicit sets, toggles membership and returns independent arrays', () => {
		const document = createDocument(['C', 'D']);
		const session = new EditingSession(document);
		const c = noteAt(document, 0);
		const d = noteAt(document, 1);
		const selection = [c, c, d];
		session.selectNotes(selection);
		selection.length = 0;
		expect(session.getSelection()).toEqual([c, d]);
		const returned = session.getSelection() as Note[];
		returned.length = 0;
		expect(session.getSelection()).toEqual([c, d]);
		session.toggle(d);
		expect(session.getFocus()).toBe(c);
		session.toggle(c);
		expect(session.getFocus()).toBeNull();
		session.toggle(d);
		expect(session.getSelection()).toEqual([d]);
	});

	it('allows explicit sets across parts but rejects cross-part ranges without changing selection', () => {
		const document = createDocument(['C']);
		const other = document.score
			.addPart()
			.addMeasure()
			.getOrCreateVoice('1')
			.addNote({ step: 'D', octave: 4, type: 'quarter' });
		const session = new EditingSession(document);
		const c = noteAt(document, 0);
		session.select(c);
		expect(() => session.select(other, { extend: true })).toThrow(
			'one part and voice',
		);
		expect(session.getSelection()).toEqual([c]);
		expect(session.getFocus()).toBe(c);
		session.selectNotes([c, other]);
		expect(session.getSelection()).toEqual([c, other]);
	});

	it('rejects another document and detached notes before altering the selection', () => {
		const document = createDocument(['C', 'D']);
		const foreign = noteAt(createDocument(['E']), 0);
		const session = new EditingSession(document);
		const c = noteAt(document, 0);
		const d = noteAt(document, 1);
		session.select(c);
		expect(() => session.selectNotes([d, foreign])).toThrow('this document');
		expect(session.getSelection()).toEqual([c]);
		d.remove();
		expect(() => session.select(d)).toThrow('this document');
		expect(session.getFocus()).toBe(c);
	});

	it('prunes removed targets and starts a fresh range after its anchor disappears', () => {
		const document = createDocument(['C', 'D']);
		const session = new EditingSession(document);
		const c = noteAt(document, 0);
		const d = noteAt(document, 1);
		session.select(c);
		c.remove();
		expect(session.getFocus()).toBeNull();
		expect(session.getSelection()).toEqual([]);
		session.select(d, { extend: true });
		expect(session.getSelection()).toEqual([d]);
	});

	it('edits a group as one undo step independent of later cursor movement', () => {
		const document = createDocument(['C', 'D', 'E']);
		const session = new EditingSession(document);
		const c = noteAt(document, 0);
		const d = noteAt(document, 1);
		const e = noteAt(document, 2);
		session.selectNotes([c, d]);
		expect(session.setPitch({ step: 'F', octave: 5 })).toBe(true);
		expect([c.pitch?.step, d.pitch?.step, e.pitch?.step]).toEqual([
			'F',
			'F',
			'E',
		]);
		session.select(e);
		expect(session.undo()).toBe(true);
		expect([c.pitch?.step, d.pitch?.step]).toEqual(['C', 'D']);
		expect(session.getFocus()).toBe(e);
		expect(session.undo()).toBe(false);
		expect(session.redo()).toBe(true);
		expect([c.pitch?.step, d.pitch?.step]).toEqual(['F', 'F']);
	});

	it('preserves redo after a no-op and drops it after a new edit', () => {
		const document = createDocument(['C']);
		const session = new EditingSession(document);
		session.move('next');
		session.setPitch({ step: 'D', octave: 4 });
		session.undo();
		expect(session.setPitch({ step: 'C', octave: 4 })).toBe(false);
		expect(session.redo()).toBe(true);
		session.undo();
		session.setPitch({ step: 'E', octave: 4 });
		expect(session.redo()).toBe(false);
		expect(noteAt(document, 0).pitch?.step).toBe('E');
		session.clearHistory();
		expect(session.undo()).toBe(false);
	});
});

describe('EditingSession events and voice context', () => {
	it('reports selection and document edits separately, including undo/redo and no-ops', () => {
		const document = createDocument(['C']);
		const editor = new EditingSession(document);
		const events: string[] = [];
		editor.events.on('selectionchange', () => events.push('selection'));
		editor.events.on('documentchange', () => events.push('document'));
		editor.move('next');
		editor.setPitch({ step: 'C', octave: 4 });
		editor.setPitch({ step: 'D', octave: 4 });
		editor.undo();
		editor.redo();
		editor.clearSelection();
		expect(events).toEqual([
			'selection',
			'document',
			'document',
			'document',
			'selection',
		]);
	});

	it('changes voice context without changing focus and rejects foreign voices', () => {
		const document = createDocument(['C']);
		const part = required(document.score.parts[0], 'part');
		part
			.addMeasure()
			.getOrCreateVoice('2')
			.addNote({ step: 'D', octave: 4, type: 'quarter' });
		const editor = new EditingSession(document);
		let changes = 0;
		editor.events.on('voicechange', () => changes++);
		editor.select(noteAt(document, 0));
		editor.setActiveVoice({ part, voice: '2' });
		expect(editor.getFocus()).toBe(noteAt(document, 0));
		expect(editor.getActiveVoice()).toEqual({ part, voice: '2' });
		expect(() => editor.setActiveVoice({ part, voice: 'missing' })).toThrow(
			'voice',
		);
		expect(changes).toBe(1);
		editor.clearSelection();
		editor.move('next');
		expect(editor.getFocus()?.voice).toBe('2');
	});
});
