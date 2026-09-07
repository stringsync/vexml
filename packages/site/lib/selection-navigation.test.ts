import { describe, expect, it } from 'bun:test';
import { MDocument } from '@stringsync/mdom';
import { EditingSession } from '@stringsync/vexml';
import { EditingVoices } from './editing-voices';
import { SelectionNavigation } from './selection-navigation';

describe('SelectionNavigation', () => {
	it('crosses into the next system first voice and reverses into the previous system last note', () => {
		const document = MDocument.empty();
		const part = document.score.addPart();
		const first = part.addMeasure();
		const top = first
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'quarter' });
		const lower = first.getOrCreateVoice('2');
		lower.addNote({ step: 'C', octave: 3, type: 'quarter' });
		const bottomLast = lower.addNote({ step: 'D', octave: 3, type: 'quarter' });
		const second = part.addMeasure();
		const nextTop = second
			.getOrCreateVoice('1')
			.addNote({ step: 'E', octave: 5, type: 'quarter' });
		const nextBottom = second
			.getOrCreateVoice('2')
			.addNote({ step: 'E', octave: 3, type: 'quarter' });
		const editor = new EditingSession(document);
		const navigation = new SelectionNavigation(new EditingVoices(editor), [
			[first],
			[second],
		]);
		editor.select(bottomLast);
		expect(navigation.voice(1)).toBe(true);
		expect(editor.getFocus()).toBe(nextTop);
		expect(navigation.voice(-1)).toBe(true);
		expect(editor.getFocus()).toBe(bottomLast);
		editor.select(top);
		expect(navigation.voice(-1)).toBe(false);
		expect(editor.getFocus()).toBe(top);
		editor.select(nextBottom);
		expect(navigation.voice(1)).toBe(false);
		expect(editor.getFocus()).toBe(nextBottom);
	});

	it('ignores voices absent from the current system and uses the new system layout', () => {
		const document = MDocument.empty();
		const part = document.score.addPart();
		const first = part.addMeasure();
		const start = first
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'quarter' });
		const second = part.addMeasure();
		const next = second
			.getOrCreateVoice('2')
			.addNote({ step: 'C', octave: 3, type: 'quarter' });
		const third = part.addMeasure();
		const last = third
			.getOrCreateVoice('3')
			.addNote({ step: 'G', octave: 3, type: 'quarter' });
		const editor = new EditingSession(document);
		const voices = new EditingVoices(editor);
		const stacked = new SelectionNavigation(voices, [
			[first],
			[second],
			[third],
		]);
		editor.select(start);
		expect(stacked.voice(1)).toBe(true);
		expect(editor.getFocus()).toBe(next);
		const panorama = new SelectionNavigation(voices, [[first, second, third]]);
		expect(panorama.voice(1)).toBe(true);
		expect(editor.getFocus()).toBe(last);
	});

	it('switches voices near the same onset inside a system', () => {
		const document = MDocument.empty();
		const measure = document.score.addPart().addMeasure();
		const focus = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'quarter', onset: 2 });
		const lower = measure.getOrCreateVoice('2');
		lower.addNote({ step: 'C', octave: 3, type: 'quarter' });
		const target = lower.addNote({
			step: 'D',
			octave: 3,
			type: 'quarter',
			onset: 2,
		});
		const editor = new EditingSession(document);
		const navigation = new SelectionNavigation(new EditingVoices(editor), [
			[measure],
		]);
		editor.select(focus);
		expect(navigation.voice(1)).toBe(true);
		expect(editor.getFocus()).toBe(target);
	});

	it('jumps measures in the active voice, skips empty measures, and lands on chord leads', () => {
		const document = MDocument.empty();
		const part = document.score.addPart();
		const first = part.addMeasure();
		const start = first
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'quarter' });
		const empty = part.addMeasure();
		empty
			.getOrCreateVoice('2')
			.addNote({ step: 'C', octave: 3, type: 'quarter' });
		const last = part.addMeasure();
		const chord = last.getOrCreateVoice('1').addChord(
			[
				{ step: 'E', octave: 4 },
				{ step: 'G', octave: 4 },
			],
			{ type: 'quarter' },
		);
		const editor = new EditingSession(document);
		const navigation = new SelectionNavigation(new EditingVoices(editor), [
			[first, empty, last],
		]);
		editor.select(start);
		expect(navigation.measure(1)).toBe(true);
		expect(editor.getFocus()).toBe(chord.lead);
		expect(navigation.measure(1)).toBe(false);
		expect(editor.getFocus()).toBe(chord.lead);
		expect(navigation.measure(-1)).toBe(true);
		expect(editor.getFocus()).toBe(start);
		expect(navigation.measure(-1)).toBe(false);
	});

	it('initializes horizontal navigation and safely handles empty scores', () => {
		const editor = new EditingSession(MDocument.empty());
		const navigation = new SelectionNavigation(new EditingVoices(editor), []);
		expect(navigation.measure(1)).toBe(false);
		expect(navigation.note(-1)).toBe(false);
		expect(navigation.voice(1)).toBe(false);
	});

	it('restores selection near playback in the active voice, including later repeat occurrences', () => {
		const document = MDocument.empty();
		const measure = document.score.addPart().addMeasure();
		const upper = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'quarter' });
		const lower = measure
			.getOrCreateVoice('2')
			.addNote({ step: 'C', octave: 3, type: 'quarter' });
		const later = measure
			.getOrCreateVoice('2')
			.addNote({ step: 'D', octave: 3, type: 'quarter' });
		const editor = new EditingSession(document);
		const voices = new EditingVoices(editor);
		editor.select(lower);
		voices.clear();
		const navigation = new SelectionNavigation(voices, [[measure]]);
		expect(
			navigation.nearPlayhead(2400, [
				{ note: lower, timeMs: 0 },
				{ note: upper, timeMs: 2400 },
				{ note: later, timeMs: 2500 },
				{ note: lower, timeMs: 4000 },
			]),
		).toBe(2500);
		expect(editor.getFocus()).toBe(later);
		voices.clear();
		expect(
			navigation.nearPlayhead(4100, [
				{ note: lower, timeMs: 0 },
				{ note: lower, timeMs: 4000 },
			]),
		).toBe(4000);
		expect(editor.getFocus()).toBe(lower);
	});

	it('falls back to an available voice near playback and leaves empty timelines unselected', () => {
		const document = MDocument.empty();
		const measure = document.score.addPart().addMeasure();
		measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'quarter' });
		const lower = measure
			.getOrCreateVoice('2')
			.addNote({ step: 'C', octave: 3, type: 'quarter' });
		const editor = new EditingSession(document);
		const navigation = new SelectionNavigation(new EditingVoices(editor), [
			[measure],
		]);
		expect(navigation.nearPlayhead(1200, [])).toBeNull();
		expect(editor.getFocus()).toBeNull();
		expect(navigation.nearPlayhead(1200, [{ note: lower, timeMs: 1000 }])).toBe(
			1000,
		);
		expect(editor.getFocus()).toBe(lower);
	});
});
