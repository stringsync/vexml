import * as data from '@/data';
import * as mdom from '@stringsync/mdom';
import * as errors from '@/errors';
import { MdomScore } from './score';
import { Config, DEFAULT_CONFIG } from '@/config';
import { Logger, NoopLogger } from '@/debug';

export type MdomParserOptions = {
  config?: Partial<Config>;
  logger?: Logger;
};

/** Parses MusicXML into a vexml data document, sourcing the data from the `@stringsync/mdom` model. */
export class MdomParser {
  private config: Config;
  private log: Logger;

  constructor(opts?: MdomParserOptions) {
    this.config = { ...DEFAULT_CONFIG, ...opts?.config };
    this.log = opts?.logger ?? new NoopLogger();
  }

  parse(musicXMLSrc: string | Document): data.Document {
    let xml: string;
    if (typeof musicXMLSrc === 'string') {
      xml = musicXMLSrc;
    } else if (musicXMLSrc instanceof Document) {
      xml = new XMLSerializer().serializeToString(musicXMLSrc);
    } else {
      throw new errors.VexmlError(`Invalid source type: ${musicXMLSrc}`);
    }

    const document = new mdom.MDOMParser().parseFromString(xml);
    const score = MdomScore.create(this.config, this.log, document.score);

    return new data.Document(score.parse());
  }
}
