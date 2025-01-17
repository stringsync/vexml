import * as mxl from '@/mxl';
import { MusicXMLParser } from '@/parsing/musicxml';
import { Document } from '@/data';
import { Config, DEFAULT_CONFIG } from '@/config';
import { Logger, NoopLogger } from '@/debug';

export type MXLParserOptions = {
  config?: Partial<Config>;
  logger?: Logger;
};

/** Parses an MXL blob. */
export class MXLParser {
  private config: Config;
  private log: Logger;

  constructor(opts?: MXLParserOptions) {
    this.config = { ...DEFAULT_CONFIG, ...opts?.config };
    this.log = opts?.logger ?? new NoopLogger();
  }

  async parse(blob: Blob): Promise<Document> {
    const musicXML = await this.raw(blob);
    const musicXMLParser = new MusicXMLParser({ config: this.config, logger: this.log });
    return musicXMLParser.parse(musicXML);
  }

  /** Returns the MusicXML document as a string. */
  async raw(blob: Blob): Promise<string> {
    return new mxl.MXL(blob).getMusicXML();
  }
}
