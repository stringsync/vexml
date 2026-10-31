import { beforeEach, describe, expect, it } from 'bun:test';
import { MDocument, MElement, type Note, type Voice } from '@stringsync/mdom';
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
	let emptyDocument: MDocument;
	let voice: Voice;

	beforeEach(() => {
		emptyDocument = MDocument.empty();
		voice = emptyDocument.score.addPart().addMeasure().getOrCreateVoice('1');
	});

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
		expect(
			session.setTabPosition({
				string: 5,
				fret: 3,
				pitch: { step: 'C', octave: 3 },
			}),
		).toBe(false);
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

	// vet-ignore simple-test-setup: the extra voice, empty measure and second staff are written only for this test; the session must be built after them because it takes over the document's history
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
		const visited = [
			session.move('next') && session.getFocus(),
			session.move('next') && session.getFocus(),
			session.move('next') && session.getFocus(),
		];
		expect(visited).toEqual([
			noteAt(document, 0),
			noteAt(document, 1),
			noteAt(document, 2),
		]);
	});

	// vet-ignore simple-test-setup: the two three-note chords are written only for this test; no other test shares them, and the session must be built after they exist because it takes over the document's history
	it.each([0, 1, 2])('moves horizontally past chord member %i', (member) => {
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
		const session = new EditingSession(emptyDocument);
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
		const chord = voice.addChord(
			[
				{ step: 'C', octave: 4 },
				{ step: 'E', octave: 4 },
			],
			{ type: 'quarter' },
		);
		const session = new EditingSession(emptyDocument);
		expect(session.move('previous')).toBe(true);
		expect(session.getFocus()).toBe(chord.lead);
	});

	it('keeps a grace chord separate from the following note at the same beat', () => {
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
		const session = new EditingSession(emptyDocument);
		session.select(upper);
		expect(session.move('next')).toBe(true);
		expect(session.getFocus()).toBe(following);
		expect(session.move('previous')).toBe(true);
		expect(session.getFocus()).toBe(chord.lead);
	});

	it('moves vertically by chord pitch even when XML stores pitches in another order', () => {
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
		const session = new EditingSession(emptyDocument);
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
		session.history.edit('Remove note', () => d.remove());
		expect(() => session.select(d)).toThrow('this document');
		expect(session.getFocus()).toBe(c);
	});

	it('prunes removed targets and starts a fresh range after its anchor disappears', () => {
		const document = createDocument(['C', 'D']);
		const session = new EditingSession(document);
		const c = noteAt(document, 0);
		const d = noteAt(document, 1);
		session.select(c);
		session.history.edit('Remove note', () => c.remove());
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

	it('edits tab positions as one undo/redo step', () => {
		const document = createDocument(['E', 'D', 'E']);
		const session = new EditingSession(document);
		const first = noteAt(document, 0);
		const second = noteAt(document, 1);
		const unselected = noteAt(document, 2);
		session.selectNotes([first, second]);
		const spec = {
			string: 5,
			fret: 3,
			pitch: { step: 'C', octave: 3 },
		};
		expect(session.setTabPosition(spec)).toBe(true);
		expect(
			[first, second, unselected].map((note) => [
				note.pitch?.step,
				note.string,
				note.fret,
			]),
		).toEqual([
			['C', 5, 3],
			['C', 5, 3],
			['E', null, null],
		]);
		expect(session.undo()).toBe(true);
		expect(
			[first, second].map((note) => [note.pitch?.step, note.string, note.fret]),
		).toEqual([
			['E', null, null],
			['D', null, null],
		]);
		expect(session.redo()).toBe(true);
		expect(
			[first, second].map((note) => [note.pitch?.step, note.string, note.fret]),
		).toEqual([
			['C', 5, 3],
			['C', 5, 3],
		]);
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
	});

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

	it('observes arbitrary native edits, rollback and undo without losing note identity', () => {
		const document = createDocument(['C', 'D']);
		const first = noteAt(document, 0);
		const second = noteAt(document, 1);
		const editor = new EditingSession(document);
		const events: string[] = [];
		editor.events.on('documentchange', () => events.push('document'));
		editor.selectNotes([first, second]);
		document.history.edit('Add slur', () => first.addSlur(second));
		expect(editor.history).toBe(document.history);
		expect(first.slurs[0]?.partner?.note).toBe(second);
		expect(() =>
			document.history.edit('Failed edit', () => {
				first.remove();
				throw new Error('cancel');
			}),
		).toThrow('cancel');
		expect(editor.getSelection()).toEqual([first, second]);
		expect(events).toEqual(['document']);
		expect(editor.history.undoLabel).toBe('Add slur');
		editor.undo();
		expect(first.slurs).toEqual([]);
		expect(editor.getFocus()).toBe(second);
		expect(events).toEqual(['document', 'document']);
		editor.dispose();
	});

	it('hides detached selection and resolves it again when a structural edit is undone', () => {
		const document = createDocument(['C']);
		const note = noteAt(document, 0);
		const editor = new EditingSession(document);
		editor.select(note);
		editor.history.edit('Remove note', () => note.remove());
		expect(editor.getSelection()).toEqual([]);
		expect(editor.getFocus()).toBeNull();
		editor.undo();
		expect(editor.getSelection()).toEqual([note]);
		expect(editor.getFocus()).toBe(note);
		editor.dispose();
	});

	it('selects an empty measure without changing the document or history', () => {
		const document = MDocument.empty();
		const part = document.score.addPart();
		part.addMeasure();
		const empty = part.addMeasure();
		const editor = new EditingSession(document);
		let selections = 0;
		let documents = 0;
		editor.events.on('selectionchange', () => selections++);
		editor.events.on('documentchange', () => documents++);
		editor.selectMeasure(empty);
		expect(editor.getStructuralFocus()).toBe(empty);
		expect(editor.getStructuralAnchor()).toBe(empty);
		expect(editor.getSelectedMeasures()).toEqual([empty]);
		expect(editor.getSelectedBarline()).toBeNull();
		expect(editor.getFocus()).toBeNull();
		expect(editor.getSelection()).toEqual([]);
		const returned = editor.getSelectedMeasures() as unknown[];
		returned.length = 0;
		expect(editor.getSelectedMeasures()).toEqual([empty]);
		expect(selections).toBe(1);
		expect(documents).toBe(0);
		expect(editor.history.canUndo).toBe(false);
		editor.clearSelection();
		expect(editor.getStructuralFocus()).toBeNull();
		expect(editor.getStructuralAnchor()).toBeNull();
		expect(editor.getSelectedMeasures()).toEqual([]);
		expect(selections).toBe(2);
		expect(editor.history.canUndo).toBe(false);
	});

	it('extends, shrinks and reverses measure ranges across empty bars in one part', () => {
		const document = MDocument.empty();
		const part = document.score.addPart();
		const otherPart = document.score.addPart();
		const first = part.addMeasure();
		const anchor = part.addMeasure();
		const middle = part.addMeasure();
		const last = part.addMeasure();
		const foreign = otherPart.addMeasure();
		const editor = new EditingSession(document);
		editor.selectMeasure(anchor);
		editor.selectMeasure(last, { extend: true });
		expect(editor.getSelectedMeasures()).toEqual([anchor, middle, last]);
		editor.selectMeasure(middle, { extend: true });
		expect(editor.getSelectedMeasures()).toEqual([anchor, middle]);
		editor.selectMeasure(first, { extend: true });
		expect(editor.getSelectedMeasures()).toEqual([first, anchor]);
		expect(editor.getStructuralAnchor()).toBe(anchor);
		expect(editor.getStructuralFocus()).toBe(first);
		expect(editor.getSelectedMeasures()).not.toContain(foreign);
		expect(() => editor.selectMeasure(foreign, { extend: true })).toThrow(
			'one part',
		);
		expect(editor.getSelectedMeasures()).toEqual([first, anchor]);
		expect(editor.getStructuralFocus()).toBe(first);
	});

	it('selects explicit repeat and middle barlines and implicit ordinary barlines', () => {
		const document = MDocument.empty();
		const part = document.score.addPart();
		const repeatedMeasure = part.addMeasure();
		const middleMeasure = part.addMeasure();
		const ordinaryMeasure = part.addMeasure();
		const repeat = repeatedMeasure.addBarline({
			location: 'right',
			repeat: { direction: 'backward' },
		});
		const middle = middleMeasure.addBarline({
			location: 'middle',
			barStyle: 'dotted',
		});
		const editor = new EditingSession(document);
		editor.selectBarline({
			measure: repeatedMeasure,
			location: 'right',
			barline: repeat,
		});
		expect(editor.getSelectedBarline()).toEqual({
			measure: repeatedMeasure,
			location: 'right',
			barline: repeat,
		});
		editor.selectBarline({
			measure: middleMeasure,
			location: 'middle',
			barline: null,
		});
		expect(editor.getSelectedBarline()?.barline).toBe(middle);
		editor.selectBarline({
			measure: ordinaryMeasure,
			location: 'right',
			barline: null,
		});
		const selected = editor.getSelectedBarline();
		expect(selected).toEqual({
			measure: ordinaryMeasure,
			location: 'right',
			barline: null,
		});
		expect(editor.getStructuralFocus()).toBe(selected);
		expect(editor.getStructuralAnchor()).toBe(selected);
		expect(editor.getSelectedMeasures()).toEqual([]);
	});

	it('prunes detached structural targets and restores them on undo', () => {
		const document = MDocument.empty();
		const measure = document.score.addPart().addMeasure();
		const barline = measure.addBarline({ location: 'right' });
		const editor = new EditingSession(document);
		editor.selectMeasure(measure);
		editor.history.edit('Remove measure', () => measure.remove());
		expect(editor.getStructuralFocus()).toBeNull();
		expect(editor.getStructuralAnchor()).toBeNull();
		expect(editor.getSelectedMeasures()).toEqual([]);
		editor.undo();
		expect(editor.getStructuralFocus()).toBe(measure);
		expect(editor.getSelectedMeasures()).toEqual([measure]);
		editor.selectBarline({ measure, location: 'right', barline });
		editor.history.edit('Remove barline', () => barline.remove());
		expect(editor.getStructuralFocus()).toBeNull();
		expect(editor.getStructuralAnchor()).toBeNull();
		expect(editor.getSelectedBarline()).toBeNull();
		editor.undo();
		expect(editor.getStructuralFocus()).toBe(editor.getSelectedBarline());
		expect(editor.getSelectedBarline()?.barline).toBe(barline);
	});

	it('rejects foreign structural targets before changing the selection', () => {
		const document = MDocument.empty();
		const measure = document.score.addPart().addMeasure();
		const foreignDocument = MDocument.empty();
		const foreignMeasure = foreignDocument.score.addPart().addMeasure();
		const foreignBarline = foreignMeasure.addBarline({ location: 'right' });
		const editor = new EditingSession(document);
		editor.selectMeasure(measure);
		expect(() => editor.selectMeasure(foreignMeasure)).toThrow('this document');
		expect(() =>
			editor.selectBarline({
				measure,
				location: 'right',
				barline: foreignBarline,
			}),
		).toThrow('this document');
		expect(editor.getStructuralFocus()).toBe(measure);
		expect(editor.getSelectedMeasures()).toEqual([measure]);
	});

	it('keeps note and structural selections mutually exclusive', () => {
		const document = createDocument(['C']);
		const note = noteAt(document, 0);
		const editor = new EditingSession(document);
		editor.select(note);
		editor.selectMeasure(note.measure);
		expect(editor.getFocus()).toBeNull();
		expect(editor.getSelection()).toEqual([]);
		expect(editor.getSelectedMeasures()).toEqual([note.measure]);
		editor.select(note);
		expect(editor.getFocus()).toBe(note);
		expect(editor.getSelection()).toEqual([note]);
		expect(editor.getStructuralFocus()).toBeNull();
		expect(editor.getStructuralAnchor()).toBeNull();
		expect(editor.getSelectedMeasures()).toEqual([]);
		editor.selectBarline({
			measure: note.measure,
			location: 'right',
			barline: null,
		});
		expect(editor.getFocus()).toBeNull();
		expect(editor.getSelection()).toEqual([]);
		expect(editor.getSelectedBarline()?.measure).toBe(note.measure);
	});

	it('sets, moves and clears a caret in an empty measure without creating history', () => {
		const part = required(emptyDocument.score.parts[0], 'part');
		const measure = required(part.measures[0], 'measure');
		const editor = new EditingSession(emptyDocument);
		const events: string[] = [];
		editor.events.on('caretchange', () => events.push('caret'));
		editor.events.on('documentchange', () => events.push('document'));
		editor.setCaret({ part, measure, voice: '1', staff: 1, onset: 0 });
		expect(editor.getCaret()).toEqual({
			part,
			measure,
			voice: '1',
			staff: 1,
			onset: 0,
		});
		expect(editor.moveCaret(2)).toBe(true);
		expect(editor.getCaret()?.onset).toBe(2);
		expect(editor.history.canUndo).toBe(false);
		editor.clearCaret();
		expect(editor.getCaret()).toBeNull();
		expect(editor.moveCaret(1)).toBe(false);
		expect(events).toEqual(['caret', 'caret', 'caret']);
	});

	it('makes caret and other selections mutually exclusive and validates targets', () => {
		const document = createDocument(['C']);
		const part = required(document.score.parts[0], 'part');
		const measure = required(part.measures[0], 'measure');
		const note = noteAt(document, 0);
		const editor = new EditingSession(document);
		editor.select(note);
		editor.setCaret({ part, measure, voice: '1', staff: 1, onset: 1 });
		expect(editor.getSelection()).toEqual([]);
		expect(editor.getFocus()).toBeNull();
		editor.select(note);
		expect(editor.getCaret()).toBeNull();
		expect(editor.getSelection()).toEqual([note]);
		editor.setCaret({ part, measure, voice: '1', staff: 1, onset: 0 });
		editor.selectMeasure(measure);
		expect(editor.getCaret()).toBeNull();
		editor.setCaret({ part, measure, voice: '1', staff: 1, onset: 0 });
		expect(editor.getSelectedMeasures()).toEqual([]);
		const foreign = createDocument(['D']);
		expect(() =>
			editor.setCaret({
				part: required(foreign.score.parts[0], 'foreign part'),
				measure: required(
					foreign.score.parts[0]?.measures[0],
					'foreign measure',
				),
				voice: '1',
				staff: 1,
				onset: 0,
			}),
		).toThrow('this document');
		expect(() =>
			editor.setCaret({ part, measure, voice: '1', staff: 1, onset: -1 }),
		).toThrow('invalid caret');
		expect(() =>
			editor.setCaret({ part, measure, voice: '1', staff: 2, onset: 0 }),
		).toThrow('invalid caret');
	});

	it('hides a caret while its measure is detached and restores it with undo', () => {
		const part = required(emptyDocument.score.parts[0], 'part');
		const measure = required(part.measures[0], 'measure');
		const editor = new EditingSession(emptyDocument);
		editor.setCaret({ part, measure, voice: '1', staff: 1, onset: 0 });
		editor.history.edit('Remove measure', () => measure.remove());
		expect(editor.getCaret()).toBeNull();
		editor.undo();
		expect(editor.getCaret()?.measure).toBe(measure);
		editor.redo();
		expect(editor.getCaret()).toBeNull();
	});

	it('releases its subscription while leaving caller-owned history usable', () => {
		const document = createDocument(['C']);
		const note = noteAt(document, 0);
		const editor = new EditingSession(document);
		const events: string[] = [];
		editor.events.on('documentchange', () => events.push('document'));
		editor.dispose();
		document.history.edit('Accent', () => note.addArticulation('accent'));
		expect(events).toEqual([]);
		expect(document.history.canUndo).toBe(true);
		document.history.undo();
		expect(note.articulations).toEqual([]);
	});
});
