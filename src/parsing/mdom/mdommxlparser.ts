import * as mxl from '@/mxl';
import { MdomParser } from './mdomparser';
import { Document } from '@/data';
import { Config, DEFAULT_CONFIG } from '@/config';
import { Logger, NoopLogger } from '@/debug';

export type MdomMXLParserOptions = {
  config?: Partial<Config>;
  logger?: Logger;
};

/** Parses an MXL (compressed MusicXML) blob via the mdom adapter. */
export class MdomMXLParser {
  private config: Config;
  private log: Logger;

  constructor(opts?: MdomMXLParserOptions) {
    this.config = { ...DEFAULT_CONFIG, ...opts?.config };
    this.log = opts?.logger ?? new NoopLogger();
  }

  async parse(blob: Blob): Promise<Document> {
    const musicXML = await this.raw(blob);
    return new MdomParser({ config: this.config, logger: this.log }).parse(musicXML);
  }

  /** Returns the MusicXML document as a string. */
  async raw(blob: Blob): Promise<string> {
    return new mxl.MXL(blob).getMusicXML();
  }
}
