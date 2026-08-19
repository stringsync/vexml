import { describe, expect, it } from 'bun:test';
import { MDocument, type Note as MNote } from '@stringsync/mdom';
import type { Note } from './note';
import { Voice } from './voice';

/* One part, one measure, one note: the smallest score that carries an mdom note to look up. */
function noteFixture(): MNote {
	return MDocument.empty()
		.score.addPart({ id: 'P1', name: 'M' })
		.addMeasure()
		.getOrCreateVoice('1')
		.addNote({ step: 'C', octave: 4, type: 'quarter' });
}

describe('Voice', () => {
	it('resolves its mdom notes through the lookup, skipping unrendered ones', () => {
		const mnote = noteFixture();
		const lookup = new Map<MNote, Note>();
		const voice = new Voice('1', 1, [mnote], lookup);
		expect(voice.getId()).toBe('1');
		expect(voice.getStave()).toBe(1);
		// Not rendered yet: the lookup is empty, so the note is skipped, not thrown on.
		expect(voice.getNotes()).toEqual([]);
		const note = { fake: true } as unknown as Note;
		lookup.set(mnote, note);
		expect(voice.getNotes()).toEqual([note]);
	});
});
