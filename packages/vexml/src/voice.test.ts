import { describe, expect, it } from 'bun:test';
import { MDOMParser, type Note as MNote } from '@stringsync/mdom';
import type { Note } from './note';
import { Voice } from './voice';

/* One part, one measure, one note: the smallest score that carries an mdom note to look up. */
const XML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;

describe('Voice', () => {
	it('resolves its mdom notes through the lookup, skipping unrendered ones', () => {
		const mdoc = new MDOMParser().parseFromString(XML);
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
