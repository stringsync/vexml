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

describe('DefaultScoreParser', () => {
	it('parses a MusicXML string into a document', async () => {
		const parser = new DefaultScoreParser();
		const mdoc = await parser.parse(XML);
		expect(mdoc.score.parts).toHaveLength(1);
		expect(mdoc.score.parts[0]?.measures).toHaveLength(1);
	});

	it('rejects input that is not a string or Blob', async () => {
		const parser = new DefaultScoreParser();
		await expect(parser.parse(42 as unknown as string)).rejects.toThrow(
			new TypeError('render: input is not a string or Blob'),
		);
	});
});
