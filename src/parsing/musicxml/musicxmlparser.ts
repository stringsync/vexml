import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { Score } from './score';
import { Config, DEFAULT_CONFIG } from '@/config';
import { Logger, NoopLogger } from '@/debug';

export type MusicXMLParserOptions = {
  config?: Partial<Config>;
  logger?: Logger;
};

/** Parses a MusicXML document string. */
export class MusicXMLParser {
  private config: Config;
  private log: Logger;

  constructor(opts?: MusicXMLParserOptions) {
    this.config = { ...DEFAULT_CONFIG, ...opts?.config };
    this.log = opts?.logger ?? new NoopLogger();
  }

  parse(musicXMLString: string): data.Document {
    const musicXML = this.parseMusicXMLString(musicXMLString);
    const scorePartwise = musicXML.getScorePartwise();
    const score = Score.create(this.config, this.log, { scorePartwise }).parse();
    return new data.Document(score);
  }

  private parseMusicXMLString(musicXML: string): musicxml.MusicXML {
    const xml = new DOMParser().parseFromString(musicXML, 'application/xml');
    return new musicxml.MusicXML(xml);
  }
}
