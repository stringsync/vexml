import { describe, expect, it } from 'bun:test';
import { MDOMParser, MDocument } from '@stringsync/mdom';
import { EditingSession } from '@stringsync/vexml';
import { NoteEditing } from './note-editing';

// TODO: webappwiz/disposable once scoped cleanup continues after a release throws.
describe('NoteEditing', () => {
	it('shows mixed pitches and applies a group as one undo step', () => {
		using resources = new DisposableStack();
		const document = MDocument.empty();
		const voice = document.score.addPart().addMeasure().getOrCreateVoice('1');
		const first = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
		const second = voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
		resources.adopt(document.history, (history) => history.dispose());
		const editor = resources.adopt(new EditingSession(document), (editor) =>
			editor.dispose(),
		);
		const form = resources.adopt(new NoteEditing(editor), (form) =>
			form.dispose(),
		);
		editor.selectNotes([first, second]);
		expect(form).toMatchObject({
			step: '',
			octave: '4',
			alter: '0',
			canApplyPitch: false,
		});
		form.setPitchField('step', 'F');
		form.applyPitch();
		expect(first.pitch).toMatchObject({ step: 'F', octave: 4 });
		expect(second.pitch).toMatchObject({ step: 'F', octave: 4 });
		expect(editor.history.undoLabel).toBe('Set pitch');
		editor.undo();
		expect(first.pitch?.step).toBe('C');
		expect(second.pitch?.step).toBe('D');
		expect(editor.history.canUndo).toBe(false);
		expect(form.step).toBe('');
	});

	it('adds staccato to a mixed selection once and removes it without touching other marks', () => {
		using resources = new DisposableStack();
		const document = MDocument.empty();
		const voice = document.score.addPart().addMeasure().getOrCreateVoice('1');
		const first = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
		const second = voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
		first.addArticulation('staccato');
		first.addArticulation('accent');
		resources.adopt(document.history, (history) => history.dispose());
		const editor = resources.adopt(new EditingSession(document), (editor) =>
			editor.dispose(),
		);
		const form = resources.adopt(new NoteEditing(editor), (form) =>
			form.dispose(),
		);
		editor.selectNotes([first, second]);
		expect(form.staccato).toBe('indeterminate');
		form.toggleStaccato();
		expect(first.articulations).toEqual(['staccato', 'accent']);
		expect(second.articulations).toEqual(['staccato']);
		expect(form.staccato).toBe(true);
		form.toggleStaccato();
		expect(first.articulations).toEqual(['accent']);
		expect(second.articulations).toEqual([]);
		expect(form.staccato).toBe(false);
		editor.undo();
		editor.undo();
		expect(first.articulations).toEqual(['staccato', 'accent']);
		expect(second.articulations).toEqual([]);
		expect(editor.history.canUndo).toBe(false);
	});

	it('keeps staccato available when a rest prevents pitch editing', () => {
		using resources = new DisposableStack();
		const document = MDocument.empty();
		const voice = document.score.addPart().addMeasure().getOrCreateVoice('1');
		const note = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
		const rest = voice.addRest({ type: 'quarter' });
		resources.adopt(document.history, (history) => history.dispose());
		const editor = resources.adopt(new EditingSession(document), (editor) =>
			editor.dispose(),
		);
		const form = resources.adopt(new NoteEditing(editor), (form) =>
			form.dispose(),
		);
		editor.selectNotes([note, rest]);
		expect(form.pitchReason).toContain('ordinary pitched notes');
		form.setPitchField('step', 'F');
		form.applyPitch();
		expect(note.pitch?.step).toBe('C');
		expect(rest.isRest).toBe(true);
		form.toggleStaccato();
		expect(note.articulations).toEqual(['staccato']);
		expect(rest.articulations).toEqual(['staccato']);
	});

	it('exports the edited document and undo restores the original MusicXML', () => {
		using resources = new DisposableStack();
		const document = MDocument.empty();
		const note = document.score
			.addPart()
			.addMeasure()
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'quarter' });
		resources.adopt(document.history, (history) => history.dispose());
		const editor = resources.adopt(new EditingSession(document), (editor) =>
			editor.dispose(),
		);
		const form = resources.adopt(new NoteEditing(editor), (form) =>
			form.dispose(),
		);
		const original = form.serialize();
		editor.select(note);
		form.setPitchField('step', 'G');
		form.applyPitch();
		form.toggleStaccato();
		const exported = new MDOMParser().parseFromString(form.serialize());
		expect(exported.score.parts[0]?.measures[0]?.notes[0]?.pitch?.step).toBe(
			'G',
		);
		expect(
			exported.score.parts[0]?.measures[0]?.notes[0]?.articulations,
		).toEqual(['staccato']);
		editor.undo();
		editor.undo();
		expect(form.serialize()).toBe(original);
	});
});
