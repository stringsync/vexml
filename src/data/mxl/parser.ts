import * as mxl from '@/mxl';
import { Document, MusicXMLParser } from '@/data';

/** Parses an MXL blob. */
export class Parser {
  async parse(blob: Blob): Promise<Document> {
    const musicXML = await new mxl.MXL(blob).getMusicXML();
    const musicXMLParser = new MusicXMLParser();
    return musicXMLParser.parse(musicXML);
  }
}
