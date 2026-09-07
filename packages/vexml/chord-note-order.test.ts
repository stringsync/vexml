import { describe, expect, it } from 'bun:test';
import { MDocument, MElement, type Note } from '@stringsync/mdom';
import { ChordNoteOrder } from './chord-note-order';

function required(note: Note | undefined): Note {
	if (!note) {
		throw new Error('missing chord member');
	}
	return note;
}

describe('ChordNoteOrder', () => {
	it('uses written position rather than sounding pitch, and preserves equal-position order', () => {
		const document = MDocument.empty();
		const voice = document.score.addPart().addMeasure().getOrCreateVoice('1');
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
});

describe('ChordNoteOrder staff positions', () => {
	it('orders cross-staff chord members by staff before pitch', () => {
		const document = MDocument.empty();
		const voice = document.score.addPart().addMeasure().getOrCreateVoice('1');
		const chord = voice.addChord(
			[
				{ step: 'C', octave: 4 },
				{ step: 'G', octave: 5 },
			],
			{ type: 'whole' },
		);
		const lowerStaff = required(chord.notes[1]);
		if (!lowerStaff) {
			throw new Error('missing cross-staff chord member');
		}
		const staff = new MElement('staff');
		staff.setText('2');
		lowerStaff.child('staff')?.remove();
		lowerStaff.append(staff);
		expect(new ChordNoteOrder().of(chord.lead)).toEqual(chord.notes);
	});

	it('orders unpitched chord members by their displayed position', () => {
		const document = MDocument.empty();
		const voice = document.score.addPart().addMeasure().getOrCreateVoice('1');
		const chord = voice.addChord(
			[
				{ step: 'C', octave: 4 },
				{ step: 'G', octave: 4 },
			],
			{ type: 'whole' },
		);
		for (const note of chord.notes) {
			const pitch = note.pitch;
			if (!pitch) {
				throw new Error('missing pitch');
			}
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
		expect(new ChordNoteOrder().of(chord.lead)).toEqual(
			[...chord.notes].reverse(),
		);
	});
});
