import { beforeEach, describe, expect, it } from 'bun:test';
import { MDocument, MElement, type Note, type Voice } from '@stringsync/mdom';
import { ChordNoteOrder } from './chord-note-order';

describe('ChordNoteOrder', () => {
	let voice: Voice;

	beforeEach(() => {
		voice = MDocument.empty()
			.score.addPart()
			.addMeasure()
			.getOrCreateVoice('1');
	});

	it('uses written position rather than sounding pitch, and preserves equal-position order', () => {
		const chord = voice.addChord(
			[
				{ step: 'B', octave: 4, alter: 1 },
				{ step: 'C', octave: 5, alter: -1 },
				{ step: 'C', octave: 5, alter: 1 },
			],
			{ type: 'whole' },
		);
		expect(new ChordNoteOrder().of(chord.lead)).toEqual([
			required(chord.notes[1]),
			required(chord.notes[2]),
			required(chord.notes[0]),
		]);
		expect(chord.notes[0]).toBe(chord.lead);
	});

	// scry-ignore simple-test-setup: each test builds a different chord (pitches differ per case), so the addChord call is the input under test, not shared setup; the shared voice is already in beforeEach.
	it('orders cross-staff chord members by staff before pitch', () => {
		const chord = voice.addChord(
			[
				{ step: 'C', octave: 4 },
				{ step: 'G', octave: 5 },
			],
			{ type: 'whole' },
		);
		const lowerStaff = required(chord.notes[1]);
		const staff = new MElement('staff');
		staff.setText('2');
		lowerStaff.child('staff')?.remove();
		lowerStaff.append(staff);
		expect(new ChordNoteOrder().of(chord.lead)).toEqual(chord.notes);
	});

	it('orders unpitched chord members by their displayed position', () => {
		const chord = voice.addChord(
			[
				{ step: 'C', octave: 4 },
				{ step: 'G', octave: 4 },
			],
			{ type: 'whole' },
		);
		toUnpitched(required(chord.notes[0]));
		toUnpitched(required(chord.notes[1]));
		expect(new ChordNoteOrder().of(chord.lead)).toEqual(
			[...chord.notes].reverse(),
		);
	});
});

function toUnpitched(note: Note) {
	const pitch = required(note.pitch);
	const unpitched = new MElement('unpitched');
	const step = new MElement('display-step');
	step.setText(pitch.step);
	const octave = new MElement('display-octave');
	octave.setText(String(pitch.octave));
	unpitched.append(step);
	unpitched.append(octave);
	pitch.remove();
	note.append(unpitched);
}

function required<T>(value: T | null | undefined): T {
	if (!value) {
		throw new Error('missing value');
	}
	return value;
}
