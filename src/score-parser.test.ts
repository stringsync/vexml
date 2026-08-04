import { describe, expect, it } from 'bun:test';
import { DefaultScoreParser } from './score-parser';

const XML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`;

// C4 -> C5 -> C6, where the middle note ends one slur and starts another but writes the
// start FIRST — the exporter ordering (Guitar Pro, Finale) that mdom used to self-pair into
// a zero-length span, leaving the first note's start to reach all the way to the third and
// bow one long arc over the middle one. mdom 0.2.4 pairs it; this is the regression guard,
// since the symptom only ever showed up as a wrong arc in a screenshot.
const CHAIN_XML = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type>
        <notations><slur type="start"/></notations></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type>
        <notations><slur type="start"/><slur type="stop"/></notations></note>
      <note><pitch><step>C</step><octave>6</octave></pitch><duration>1</duration><type>quarter</type>
        <notations><slur type="stop"/></notations></note>
    </measure>
  </part>
</score-partwise>`;

describe('DefaultScoreParser', () => {
	it('parses a MusicXML string into a document', async () => {
		const parser = new DefaultScoreParser();
		const mdoc = await parser.parse(XML);
		expect(mdoc.score.parts).toHaveLength(1);
		expect(mdoc.score.parts[0]?.measures).toHaveLength(1);
	});

	it('leaves a chain-middle slur written start-before-stop paired to its neighbors', async () => {
		const mdoc = await new DefaultScoreParser().parse(CHAIN_XML);
		const notes = mdoc.score.parts[0]?.measures[0]?.notes ?? [];
		const partners = notes.map((note) =>
			note.slurs.map((slur) => {
				const octave = slur.partner?.note.pitch?.octave;
				return `${slur.slurType}->${octave ?? 'none'}`;
			}),
		);
		expect(partners).toEqual([
			['start->5'],
			['start->6', 'stop->4'],
			['stop->5'],
		]);
	});

	it('rejects input that is not a string or Blob', async () => {
		const parser = new DefaultScoreParser();
		await expect(parser.parse(42 as unknown as string)).rejects.toThrow(
			new TypeError('render: input is not a string or Blob'),
		);
	});
});
