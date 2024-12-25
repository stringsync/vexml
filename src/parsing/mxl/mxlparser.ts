import * as mxl from '@/mxl';
import { MusicXMLParser } from '@/parsing/musicxml';
import { Document } from '@/data';

/** Parses an MXL blob. */
export class MXLParser {
  async parse(blob: Blob): Promise<Document> {
    const musicXML = await new mxl.MXL(blob).getMusicXML();
    const musicXMLParser = new MusicXMLParser();
    return musicXMLParser.parse(musicXML);
  }
}
