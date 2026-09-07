import { describe, expect, it } from 'bun:test';
import { MDocument } from '@stringsync/mdom';
import { EditingSession } from '@stringsync/vexml';
import { EditingVoices } from './editing-voices';

describe('EditingVoices', () => {
	it('has no choices in an empty score', () => {
		const voices = new EditingVoices(new EditingSession(MDocument.empty()));
		expect(voices.options).toEqual([]);
		expect(voices.getValue()).toBe('');
		expect(voices.move('next')).toBe(false);
		expect(voices.select('missing')).toBe(false);
	});

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

	it('switches to the closest onset in the same measure and follows the new voice', () => {
		const document = MDocument.empty();
		const measure = document.score.addPart().addMeasure();
		const focus = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'quarter', onset: 2 });
		const lower = measure.getOrCreateVoice('2');
		lower.addNote({ step: 'C', octave: 3, type: 'quarter' });
		const closest = lower.addNote({
			step: 'D',
			octave: 3,
			type: 'quarter',
			onset: 2,
		});
		const next = lower.addNote({ step: 'E', octave: 3, type: 'quarter' });
		const editor = new EditingSession(document);
		const voices = new EditingVoices(editor);
		editor.select(focus);
		expect(voices.select(JSON.stringify([0, '2']))).toBe(true);
		expect(editor.getFocus()).toBe(closest);
		expect(voices.move('next')).toBe(true);
		expect(editor.getFocus()).toBe(next);
		expect(voices.move('higher')).toBe(false);
		expect(editor.getFocus()).toBe(next);
	});

	it('remembers a clicked voice after Escape and restarts at its chord lead', () => {
		const document = MDocument.empty();
		const measure = document.score.addPart().addMeasure();
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'quarter' });
		const chord = measure.getOrCreateVoice('2').addChord(
			[
				{ step: 'C', octave: 3 },
				{ step: 'E', octave: 3 },
			],
			{ type: 'quarter' },
		);
		const editor = new EditingSession(document);
		const voices = new EditingVoices(editor);
		editor.select(chord.lead);
		expect(voices.getValue()).toBe(JSON.stringify([0, '2']));
		voices.clear();
		expect(editor.getFocus()).toBeNull();
		expect(voices.getValue()).toBe(JSON.stringify([0, '2']));
		expect(voices.move('previous')).toBe(true);
		expect(editor.getFocus()).toBe(chord.lead);
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
		expect(voices.select('[1,"1"]')).toBe(true);
		expect(editor.getFocus()).toBe(note);
	});

	it('uses the nearest populated measure when the chosen voice is absent', () => {
		const document = MDocument.empty();
		const part = document.score.addPart();
		const closest = part
			.addMeasure()
			.getOrCreateVoice('2')
			.addNote({ step: 'C', octave: 3, type: 'quarter' });
		const focus = part
			.addMeasure()
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'quarter' });
		part.addMeasure();
		part
			.addMeasure()
			.getOrCreateVoice('2')
			.addNote({ step: 'D', octave: 3, type: 'quarter' });
		const editor = new EditingSession(document);
		const voices = new EditingVoices(editor);
		editor.select(focus);
		expect(voices.select('[0,"2"]')).toBe(true);
		expect(editor.getFocus()).toBe(closest);
	});
});
