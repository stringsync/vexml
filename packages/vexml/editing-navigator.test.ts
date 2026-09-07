import { describe, expect, it } from 'bun:test';
import { MDocument } from '@stringsync/mdom';
import { EditingNavigator } from './editing-navigator';
import { EditingSession } from './editing-session';

describe('EditingNavigator', () => {
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
		const navigation = new EditingNavigator(editor, {
			getSystems: () => [[first], [second]],
		});
		editor.select(bottomLast);
		expect(navigation.move({ unit: 'voice', direction: 1 })).toBe(true);
		expect(editor.getFocus()).toBe(nextTop);
		expect(navigation.move({ unit: 'voice', direction: -1 })).toBe(true);
		expect(editor.getFocus()).toBe(bottomLast);
		editor.select(top);
		expect(navigation.move({ unit: 'voice', direction: -1 })).toBe(false);
		expect(editor.getFocus()).toBe(top);
		editor.select(nextBottom);
		expect(navigation.move({ unit: 'voice', direction: 1 })).toBe(false);
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

		const stacked = new EditingNavigator(editor, {
			getSystems: () => [[first], [second], [third]],
		});
		editor.select(start);
		expect(stacked.move({ unit: 'voice', direction: 1 })).toBe(true);
		expect(editor.getFocus()).toBe(next);
		const panorama = new EditingNavigator(editor, {
			getSystems: () => [[first, second, third]],
		});
		expect(panorama.move({ unit: 'voice', direction: 1 })).toBe(true);
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
		const navigation = new EditingNavigator(editor, {
			getSystems: () => [[measure]],
		});
		editor.select(focus);
		expect(navigation.move({ unit: 'voice', direction: 1 })).toBe(true);
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
		const navigation = new EditingNavigator(editor, {
			getSystems: () => [[first, empty, last]],
		});
		editor.select(start);
		expect(navigation.move({ unit: 'measure', direction: 1 })).toBe(true);
		expect(editor.getFocus()).toBe(chord.lead);
		expect(navigation.move({ unit: 'measure', direction: 1 })).toBe(false);
		expect(editor.getFocus()).toBe(chord.lead);
		expect(navigation.move({ unit: 'measure', direction: -1 })).toBe(true);
		expect(editor.getFocus()).toBe(start);
		expect(navigation.move({ unit: 'measure', direction: -1 })).toBe(false);
	});

	it('initializes horizontal navigation and safely handles empty scores', () => {
		const editor = new EditingSession(MDocument.empty());
		const navigation = new EditingNavigator(editor, { getSystems: () => [] });
		expect(navigation.move({ unit: 'measure', direction: 1 })).toBe(false);
		expect(navigation.move({ unit: 'note', direction: -1 })).toBe(false);
		expect(navigation.move({ unit: 'voice', direction: 1 })).toBe(false);
	});
});

describe('EditingNavigator without layout', () => {
	it('switches to a nearby onset, remembers the voice after clearing, and clamps', () => {
		const document = MDocument.empty();
		const measure = document.score.addPart().addMeasure();
		const first = measure
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
		const editor = new EditingSession(document);
		const navigator = new EditingNavigator(editor);
		editor.select(first);
		expect(navigator.move({ unit: 'voice', direction: 1 })).toBe(true);
		expect(editor.getFocus()).toBe(closest);
		expect(navigator.move({ unit: 'voice', direction: 1 })).toBe(false);
		editor.clearSelection();
		expect(editor.getActiveVoice()?.voice).toBe('2');
		expect(editor.move('previous')).toBe(true);
		expect(editor.getFocus()).toBe(closest);
	});

	it('uses the nearest populated measure when switching voice explicitly', () => {
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
		editor.select(focus);
		expect(new EditingNavigator(editor).selectVoice({ part, voice: '2' })).toBe(
			true,
		);
		expect(editor.getFocus()).toBe(closest);
	});

	it('refuses to extend navigation across voices without changing selection', () => {
		const document = MDocument.empty();
		const measure = document.score.addPart().addMeasure();
		const first = measure
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 5, type: 'quarter' });
		measure
			.getOrCreateVoice('2')
			.addNote({ step: 'C', octave: 3, type: 'quarter' });
		const editor = new EditingSession(document);
		editor.select(first);
		expect(
			new EditingNavigator(editor).move(
				{ unit: 'voice', direction: 1 },
				{ extend: true },
			),
		).toBe(false);
		expect(editor.getSelection()).toEqual([first]);
	});
});
