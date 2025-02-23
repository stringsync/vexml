import { MusicXMLParser } from '@/parsing';
import path from 'path';
import fs from 'fs';

const MUSICXML_PATH = path.resolve(__dirname, '..', '..', '..', '__data__', 'lilypond', '01a-Pitches-Pitches.musicxml');

describe(MusicXMLParser, () => {
  let musicXMLString: string;

  beforeAll(() => {
    musicXMLString = fs.readFileSync(MUSICXML_PATH).toString();
  });

  it('parses musicXML as a string', () => {
    const parser = new MusicXMLParser();
    expect(() => parser.parse(musicXMLString)).not.toThrow();
  });

  it('parses musicXML as a Document', () => {
    const parser = new MusicXMLParser();
    const document = new DOMParser().parseFromString(musicXMLString, 'application/xml');
    expect(() => parser.parse(document)).not.toThrow();
  });
});
