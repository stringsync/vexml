import { beforeEach, describe, expect, it } from 'bun:test';
import {
	MDOMParser,
	MDocument,
	MElement,
	MusicXMLSerializer,
	type Note,
	type Voice,
} from '@stringsync/mdom';
import { TabPositionEdit, type TabPositionInput } from './tab-position-edit';

function required<T>(value: T | null | undefined, name: string): T {
	if (value == null) {
		throw new Error(`missing ${name}`);
	}
	return value;
}

describe('TabPositionEdit', () => {
	let document: MDocument;
	let voice: Voice;
	let note: Note;

	beforeEach(() => {
		document = MDocument.empty();
		voice = document.score.addPart().addMeasure().getOrCreateVoice('1');
		note = voice.addNote({ step: 'E', octave: 2, type: 'quarter' });
	});

	it('sets pitch, string and fret while preserving timing and unrelated notation', () => {
		// This test needs a dotted note as the measure's only note.
		note.remove();
		const dotted = voice.addNote({
			step: 'E',
			octave: 2,
			type: 'quarter',
			dots: 1,
		});
		dotted.addArticulation('staccato');
		const accidental = new MElement('accidental');
		accidental.setText('sharp');
		dotted.insertBefore(accidental, dotted.child('staff'));
		const before = {
			duration: dotted.duration,
			onset: dotted.measureBeat,
			voice: dotted.voice,
			staff: dotted.staff,
		};

		expect(
			new TabPositionEdit([dotted]).apply({
				string: 5,
				fret: 3,
				pitch: { step: 'C', octave: 3 },
			}),
		).toBe(true);
		expect([
			dotted.pitch?.step,
			dotted.pitch?.octave,
			dotted.pitch?.alter,
		]).toEqual(['C', 3, 0]);
		expect(dotted.string).toBe(5);
		expect(dotted.fret).toBe(3);
		expect(dotted.accidental).toBeNull();
		expect(dotted.articulations).toEqual(['staccato']);
		expect({
			duration: dotted.duration,
			onset: dotted.measureBeat,
			voice: dotted.voice,
			staff: dotted.staff,
		}).toEqual(before);

		const copy = new MDOMParser().parseFromString(
			new MusicXMLSerializer().serializeToString(document),
		);
		const restored: Note = required(
			copy.score.parts[0]?.measures[0]?.notes[0],
			'round-trip dotted',
		);
		expect([
			restored.pitch?.step,
			restored.pitch?.octave,
			restored.pitch?.alter,
		]).toEqual(['C', 3, 0]);
		expect(restored.string).toBe(5);
		expect(restored.fret).toBe(3);
		expect(restored.duration).toBe(before.duration);
	});

	it('rejects a mixed pitched/rest group before changing any member', () => {
		const rest = voice.addRest({ type: 'quarter' });
		const pitch = note.pitch;
		expect(() =>
			new TabPositionEdit([note, rest]).apply({
				string: 5,
				fret: 3,
				pitch: { step: 'C', octave: 3 },
			}),
		).toThrow('pitched notes');
		expect(note.pitch).toBe(pitch);
		expect(note.string).toBeNull();
		expect(note.fret).toBeNull();
	});

	it('rejects unpitched notes', () => {
		const note = voice.addUnpitched({ type: 'quarter' });
		expect(() =>
			new TabPositionEdit([note]).apply({
				string: 5,
				fret: 3,
				pitch: { step: 'C', octave: 3 },
			}),
		).toThrow('pitched notes');
		expect(note.child('unpitched')).not.toBeNull();
		expect(note.string).toBeNull();
	});

	it('rejects a tied group before changing its first member', () => {
		const tied = voice.addNote({ step: 'D', octave: 3, type: 'quarter' });
		const next = voice.addNote({ step: 'D', octave: 3, type: 'quarter' });
		tied.addTie(next);
		expect(() =>
			new TabPositionEdit([note, tied]).apply({
				string: 5,
				fret: 3,
				pitch: { step: 'C', octave: 3 },
			}),
		).toThrow('tie-aware');
		expect(note.pitch?.step).toBe('E');
		expect(note.string).toBeNull();
		expect(tied.ties[0]?.partner?.note).toBe(next);
	});

	it.each([
		{ string: 0, fret: 3 },
		{ string: 1.5, fret: 3 },
		{ string: 5, fret: -1 },
		{ string: 5, fret: 1.5 },
	])('rejects invalid string/fret input $string/$fret', ({ string, fret }) => {
		expect(() =>
			new TabPositionEdit([note]).apply({
				string,
				fret,
				pitch: { step: 'C', octave: 3 },
			}),
		).toThrow('invalid tab position');
		expect(note.pitch?.step).toBe('E');
		expect(note.string).toBeNull();
	});

	it('rejects an invalid pitch before changing string or fret', () => {
		expect(() =>
			new TabPositionEdit([note]).apply({
				string: 5,
				fret: 3,
				pitch: { step: 'H', octave: 3 },
			}),
		).toThrow('invalid pitch');
		expect(note.pitch?.step).toBe('E');
		expect(note.string).toBeNull();
	});

	it('returns false for empty and unchanged groups without removing an accidental', () => {
		const spec: TabPositionInput = {
			string: 5,
			fret: 3,
			pitch: { step: 'C', octave: 3 },
		};
		expect(new TabPositionEdit([]).apply(spec)).toBe(false);
		expect(new TabPositionEdit([note]).apply(spec)).toBe(true);
		const accidental = new MElement('accidental');
		accidental.setText('natural');
		note.insertBefore(accidental, note.child('staff'));
		expect(new TabPositionEdit([note]).apply(spec)).toBe(false);
		expect(note.child('accidental')).toBe(accidental);
	});

	it('keeps an explicit accidental when only the tab position changes', () => {
		const note = voice.addNote({ step: 'C', octave: 3, type: 'quarter' });
		const accidental = new MElement('accidental');
		accidental.setText('natural');
		note.insertBefore(accidental, note.child('staff'));
		expect(
			new TabPositionEdit([note]).apply({
				string: 5,
				fret: 3,
				pitch: { step: 'C', octave: 3 },
			}),
		).toBe(true);
		expect(note.child('accidental')).toBe(accidental);
	});
});
