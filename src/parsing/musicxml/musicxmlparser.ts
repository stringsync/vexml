import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as errors from '@/errors';
import { Score } from './score';
import { Config, DEFAULT_CONFIG } from '@/config';
import { Logger, NoopLogger } from '@/debug';

export type MusicXMLParserOptions = {
  config?: Partial<Config>;
  logger?: Logger;
};

export class MusicXMLParser {
  private config: Config;
  private log: Logger;

  constructor(opts?: MusicXMLParserOptions) {
    this.config = { ...DEFAULT_CONFIG, ...opts?.config };
    this.log = opts?.logger ?? new NoopLogger();
  }

  /** Parses a MusicXML source into a vexml data document. */
  parse(musicXMLSrc: string | XMLDocument): data.Document {
    let musicXML: musicxml.MusicXML;
    if (musicXMLSrc instanceof XMLDocument) {
      musicXML = new musicxml.MusicXML(musicXMLSrc);
    } else if (typeof musicXMLSrc === 'string') {
      musicXML = new musicxml.MusicXML(new DOMParser().parseFromString(musicXMLSrc, 'application/xml'));
    } else {
      throw new errors.VexmlError(`Invalid source type: ${musicXMLSrc}`);
    }

    const scorePartwise = musicXML.getScorePartwise();
    const score = Score.create(this.config, this.log, { scorePartwise }).parse();

    return new data.Document(score);
  }
}
