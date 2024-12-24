import * as musicxml from '@/musicxml';
import * as data from '@/data';
import { MXL } from './mxl';

/** Parses an MXL blob. */
export class Parser {
  async parse(blob: Blob): Promise<data.Document> {
    const musicXML = await new MXL(blob).getMusicXML();
    const musicXMLParser = new musicxml.Parser();
    return musicXMLParser.parse(musicXML);
  }
}
