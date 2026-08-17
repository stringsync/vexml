import { describe, expect, it } from 'bun:test';
import { MDOMParser, type Note as MNote } from '@stringsync/mdom';
import { MEASURE_XML } from './measure-harness';
import type { Note } from './note';
import { Voice } from './voice';

describe('Voice', () => {
	it('resolves its mdom notes through the lookup, skipping unrendered ones', () => {
		const mdoc = new MDOMParser().parseFromString(MEASURE_XML);
		const mnote = mdoc.score.parts[0]?.measures[0]?.notes[0];
		if (!mnote) {
			throw new Error('fixture: missing note');
		}
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
