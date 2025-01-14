import * as mxl from '@/mxl';
import { MusicXMLParser } from '@/parsing/musicxml';
import { Document } from '@/data';

/** Parses an MXL blob. */
export class MXLParser {
  async parse(blob: Blob): Promise<Document> {
    const musicXML = await this.raw(blob);
    const musicXMLParser = new MusicXMLParser();
    return musicXMLParser.parse(musicXML);
  }

  /** Returns the MusicXML document as a string. */
  async raw(blob: Blob): Promise<string> {
    return new mxl.MXL(blob).getMusicXML();
  }
}
