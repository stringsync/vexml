import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { Score } from './score';

/** Parses a MusicXML document string. */
export class MusicXMLParser {
  parse(musicXMLString: string): data.Document {
    const musicXML = this.parseMusicXMLString(musicXMLString);
    const scorePartwise = musicXML.getScorePartwise();
    const score = Score.create({ scorePartwise }).parse();
    return new data.Document(score);
  }

  private parseMusicXMLString(musicXML: string): musicxml.MusicXML {
    const xml = new DOMParser().parseFromString(musicXML, 'application/xml');
    return new musicxml.MusicXML(xml);
  }
}
