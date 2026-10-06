import { describe, expect, it } from 'bun:test';
import { MDOMParser, type Note } from '@stringsync/mdom';
import { DurationTranslator } from './duration-translator';
import { DynamicGlyphs } from './dynamic-glyphs';
import { ScoreReader } from './score-reader';

// The first note of a one-measure score in `time`, at 3 divisions per quarter.
function noteOf(time: string, note: string): Note {
	const xml = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>3</divisions>${time}</attributes>
      ${note}
    </measure>
  </part>
</score-partwise>`;
	const mnote = new MDOMParser().parseFromString(xml).score.parts[0]
		?.measures[0]?.notes[0];
	if (!mnote) {
		throw new Error('missing note');
	}
	return mnote;
}

const THREE_FOUR = '<time><beats>3</beats><beat-type>4</beat-type></time>';
const SIX_EIGHT = '<time><beats>6</beats><beat-type>8</beat-type></time>';

describe('DurationTranslator', () => {
	const durations = new DurationTranslator(
		new ScoreReader(new DynamicGlyphs()),
	);

	it('reads a typed note off its type', () => {
		const note = noteOf(
			THREE_FOUR,
			'<note><rest/><duration>9</duration><type>half</type></note>',
		);
		expect(durations.code(note)).toBe('h');
	});

	it('draws a typeless rest lasting its whole 3/4 bar as a whole rest', () => {
		const note = noteOf(
			THREE_FOUR,
			'<note><rest measure="yes"/><duration>9</duration></note>',
		);
		expect(durations.code(note)).toBe('w');
	});

	it('draws a typeless rest lasting its whole 6/8 bar as a whole rest', () => {
		const note = noteOf(
			SIX_EIGHT,
			'<note><rest/><duration>9</duration></note>',
		);
		expect(durations.code(note)).toBe('w');
	});

	it('maps a shorter typeless rest to the note value it equals', () => {
		const note = noteOf(
			THREE_FOUR,
			'<note><rest/><duration>3</duration></note>',
		);
		expect(durations.code(note)).toBe('q');
	});
});
