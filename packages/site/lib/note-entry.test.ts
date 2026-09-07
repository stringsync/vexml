import { describe, expect, it } from 'bun:test';
import { MDOMParser, MusicXMLSerializer } from '@stringsync/mdom';
import { EditingSession } from '@stringsync/vexml';
import { ensure } from 'webappwiz/assert';
import { NewNotation } from './new-notation';
import { NoteEditing } from './note-editing';
import { NoteEntry } from './note-entry';

describe('NoteEntry', () => {
	it('keeps a canceled staff preview out of MusicXML and history', () => {
		using resources = new DisposableStack();
		const document = new MDOMParser().parseFromString(
			new NewNotation().create('staff'),
		);
		resources.adopt(document.history, (history) => history.dispose());
		const editor = resources.adopt(new EditingSession(document), (editor) =>
			editor.dispose(),
		);
		const entry = resources.adopt(new NoteEntry(editor), (entry) =>
			entry.dispose(),
		);
		const before = new MusicXMLSerializer().serializeToString(document);
		entry.handleKey({
			key: 'c',
			altKey: false,
			ctrlKey: false,
			metaKey: false,
			shiftKey: false,
		});
		entry.handleKey({
			key: 'ArrowUp',
			altKey: false,
			ctrlKey: false,
			metaKey: false,
			shiftKey: false,
		});
		expect(entry.draft).toMatchObject({ step: 'D', octave: 4, note: null });
		expect(document.history.canUndo).toBe(false);
		expect(new MusicXMLSerializer().serializeToString(document)).toBe(before);
		entry.handleKey({
			key: 'Escape',
			altKey: false,
			ctrlKey: false,
			metaKey: false,
			shiftKey: false,
		});
		expect(entry.draft).toBeNull();
		expect(new MusicXMLSerializer().serializeToString(document)).toBe(before);
	});

	it('commits a whole note then creates the next bar atomically and undoes it', () => {
		using resources = new DisposableStack();
		const document = new MDOMParser().parseFromString(
			new NewNotation().create('staff'),
		);
		resources.adopt(document.history, (history) => history.dispose());
		const editor = resources.adopt(new EditingSession(document), (editor) =>
			editor.dispose(),
		);
		const entry = resources.adopt(new NoteEntry(editor), (entry) =>
			entry.dispose(),
		);
		entry.begin();
		entry.setDuration('whole');
		entry.commit();
		const part = ensure.present(document.score.parts[0]);
		expect(part.measures).toHaveLength(1);
		expect(part.measures[0]?.notes[0]?.beats).toBe(4);
		expect(entry.draft?.note).toBeNull();
		entry.commit();
		expect(part.measures).toHaveLength(2);
		expect(part.measures[1]?.notes[0]?.measureBeat).toBe(0);
		editor.undo();
		expect(part.measures).toHaveLength(1);
		expect(entry.draft).toBeNull();
		editor.redo();
		expect(part.measures[1]?.notes).toHaveLength(1);
	});

	it('keeps a tab placeholder silent and derives committed pitch from string tuning', () => {
		using resources = new DisposableStack();
		const document = new MDOMParser().parseFromString(
			new NewNotation().create('tab'),
		);
		resources.adopt(document.history, (history) => history.dispose());
		const editor = resources.adopt(new EditingSession(document), (editor) =>
			editor.dispose(),
		);
		const entry = resources.adopt(new NoteEntry(editor), (entry) =>
			entry.dispose(),
		);
		entry.begin();
		entry.commit();
		expect(document.history.canUndo).toBe(false);
		entry.handleKey({
			key: 'ArrowDown',
			altKey: false,
			ctrlKey: false,
			metaKey: false,
			shiftKey: false,
		});
		entry.handleKey({
			key: '1',
			altKey: false,
			ctrlKey: false,
			metaKey: false,
			shiftKey: false,
		});
		entry.handleKey({
			key: '2',
			altKey: false,
			ctrlKey: false,
			metaKey: false,
			shiftKey: false,
		});
		expect(entry.draft).toMatchObject({ string: 2, fret: '12' });
		expect(document.score.parts[0]?.measures[0]?.notes).toHaveLength(0);
		entry.commit();
		const note = ensure.present(document.score.parts[0]?.measures[0]?.notes[0]);
		expect(note).toMatchObject({ string: 2, fret: 12, beats: 1 });
		expect(note.pitch).toMatchObject({ step: 'B', octave: 4, alter: 0 });
		editor.undo();
		expect(document.score.parts[0]?.measures[0]?.notes).toHaveLength(0);
	});

	it('changes selected duration through mdom and restores the following onset on undo', () => {
		using resources = new DisposableStack();
		const document = new MDOMParser().parseFromString(
			new NewNotation().create('staff'),
		);
		const voice = ensure
			.present(document.score.parts[0]?.measures[0])
			.getOrCreateVoice('1');
		const first = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
		const second = voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
		resources.adopt(document.history, (history) => history.dispose());
		const editor = resources.adopt(new EditingSession(document), (editor) =>
			editor.dispose(),
		);
		const form = resources.adopt(new NoteEditing(editor), (form) =>
			form.dispose(),
		);
		editor.select(first);
		form.entry.begin();
		form.setDuration('half');
		expect(first.beats).toBe(2);
		expect(second.measureBeat).toBe(2);
		expect(form.duration).toBe('half');
		expect(editor.history.undoLabel).toBe('Change duration');
		editor.undo();
		expect(first.beats).toBe(1);
		expect(second.measureBeat).toBe(1);
		expect(editor.getFocus()).toBe(first);
	});

	it('discards a draft when selection changes and preserves note identity on pitch edits', () => {
		using resources = new DisposableStack();
		const document = new MDOMParser().parseFromString(
			new NewNotation().create('staff'),
		);
		const voice = ensure
			.present(document.score.parts[0]?.measures[0])
			.getOrCreateVoice('1');
		const first = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
		const second = voice.addNote({ step: 'D', octave: 4, type: 'quarter' });
		resources.adopt(document.history, (history) => history.dispose());
		const editor = resources.adopt(new EditingSession(document), (editor) =>
			editor.dispose(),
		);
		const entry = resources.adopt(new NoteEntry(editor), (entry) =>
			entry.dispose(),
		);
		editor.select(first);
		entry.handleKey({
			key: 'g',
			altKey: false,
			ctrlKey: false,
			metaKey: false,
			shiftKey: false,
		});
		editor.select(second);
		expect(entry.draft).toBeNull();
		expect(first.pitch?.step).toBe('C');
		entry.handleKey({
			key: 'e',
			altKey: false,
			ctrlKey: false,
			metaKey: false,
			shiftKey: false,
		});
		entry.commit();
		expect(voice.notes[1]).toBe(second);
		expect(second.pitch?.step).toBe('E');
		editor.undo();
		expect(second.pitch?.step).toBe('D');
	});
});
