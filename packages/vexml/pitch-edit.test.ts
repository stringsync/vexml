import { describe, expect, it } from 'bun:test';
import { MDocument, MElement, MusicXMLSerializer } from '@stringsync/mdom';
import { PitchEdit } from './pitch-edit';

describe('PitchEdit', () => {
	it('restores exact XML, pitch and accidental identity through repeated undo/redo', () => {
		const document = MDocument.empty();
		const voice = document.score.addPart().addMeasure().getOrCreateVoice('1');
		const note = voice.addNote({
			step: 'C',
			alter: 1,
			octave: 4,
			type: 'quarter',
			dots: 1,
		});
		const next = voice.addNote({ step: 'D', octave: 4, type: 'eighth' });
		const accidental = new MElement('accidental');
		accidental.setText('sharp');
		accidental.setAttribute('cautionary', 'yes');
		note.insertBefore(accidental, note.child('staff'));
		note.addArticulation('staccato');
		note.addSlur(next);
		const pitch = note.pitch;
		const serializer = new MusicXMLSerializer();
		const original = serializer.serializeToString(document);
		document.history.edit('Pitch', () =>
			new PitchEdit([note]).apply({ step: 'F', octave: 5, alter: -0.5 }),
		);
		const edited = serializer.serializeToString(document);
		expect(note.pitch?.step).toBe('F');
		expect(note.pitch?.alter).toBe(-0.5);
		expect(note.accidental).toBeNull();
		expect(note.beats).toBe(1.5);
		expect(next.measureBeat).toBe(1.5);
		expect(note.slurs[0]?.partner?.note).toBe(next);
		for (let index = 0; index < 3; index++) {
			document.history.undo();
			expect(serializer.serializeToString(document)).toBe(original);
			expect(note.pitch).toBe(pitch);
			expect(note.child('accidental')).toBe(accidental);
			document.history.redo();
			expect(serializer.serializeToString(document)).toBe(edited);
		}
	});

	it('rejects a mixed pitched/rest group before changing any member', () => {
		const document = MDocument.empty();
		const voice = document.score.addPart().addMeasure().getOrCreateVoice('1');
		const note = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
		const rest = voice.addRest({ type: 'quarter' });
		const pitch = note.pitch;
		expect(() =>
			new PitchEdit([note, rest]).apply({ step: 'D', octave: 4 }),
		).toThrow('pitched notes');
		expect(note.pitch).toBe(pitch);
		expect(rest.isRest).toBe(true);
	});

	it('rejects invalid pitches before changing the document', () => {
		const document = MDocument.empty();
		const note = document.score
			.addPart()
			.addMeasure()
			.getOrCreateVoice('1')
			.addNote({ step: 'C', octave: 4, type: 'quarter' });
		const pitch = note.pitch;
		for (const spec of [
			{ step: 'H', octave: 4 },
			{ step: 'D', octave: -1 },
			{ step: 'D', octave: 10 },
			{ step: 'D', octave: 4.5 },
			{ step: 'D', octave: 4, alter: Number.NaN },
		]) {
			expect(() => new PitchEdit([note]).apply(spec)).toThrow('invalid pitch');
		}
		expect(note.pitch).toBe(pitch);
	});

	it('does not silently break a tie when repitching one endpoint', () => {
		const document = MDocument.empty();
		const voice = document.score.addPart().addMeasure().getOrCreateVoice('1');
		const first = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
		const second = voice.addNote({ step: 'C', octave: 4, type: 'quarter' });
		first.addTie(second);
		expect(() =>
			new PitchEdit([first]).apply({ step: 'D', octave: 4 }),
		).toThrow('tie-aware');
		expect(first.pitch?.step).toBe('C');
		expect(first.ties[0]?.partner?.note).toBe(second);
	});

	it('does not leave a guitar fingering inconsistent with its pitch', () => {
		const document = MDocument.empty();
		const note = document.score
			.addPart()
			.addMeasure()
			.getOrCreateVoice('1')
			.addNote({ step: 'E', octave: 4, type: 'quarter' });
		note.setStringFret({ string: 1, fret: 0 });
		expect(() => new PitchEdit([note]).apply({ step: 'F', octave: 4 })).toThrow(
			'fingering-aware',
		);
		expect(note.pitch?.step).toBe('E');
		expect(note.fret).toBe(0);
	});
});
