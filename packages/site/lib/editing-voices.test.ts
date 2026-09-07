import { describe, expect, it } from 'bun:test';
import { MDocument } from '@stringsync/mdom';
import { EditingSession } from '@stringsync/vexml';
import { EditingVoices } from './editing-voices';

describe('EditingVoices', () => {
	it('lists a voice once across measures and staves', () => {
		const document = MDocument.empty();
		const part = document.score.addPart();
		part
			.addMeasure()
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'quarter' });
		part
			.addMeasure()
			.getOrCreateVoice('1', { staff: '2' })
			.addNote({ step: 'D', octave: 4, type: 'quarter' });
		const voices = new EditingVoices(new EditingSession(document));
		expect(voices.options).toMatchObject([{ voice: '1', label: 'Voice 1' }]);
	});

	it('distinguishes identically numbered voices in different parts', () => {
		const document = MDocument.empty();
		const upper = document.score.addPart();
		upper
			.addMeasure()
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'quarter' });
		const lower = document.score.addPart();
		const note = lower
			.addMeasure()
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 3, type: 'quarter' });
		const editor = new EditingSession(document);
		const voices = new EditingVoices(editor);
		expect(voices.options).toMatchObject([
			{ value: '[0,"1"]', part: upper },
			{ value: '[1,"1"]', part: lower },
		]);
		editor.select(note);
		expect(voices.getValue()).toBe('[1,"1"]');
		expect(editor.getFocus()).toBe(note);
	});
});
