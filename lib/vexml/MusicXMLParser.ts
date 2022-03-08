import { XMLNode } from "./types";

export class MusicXMLParser {
  static parseResult = Symbol('MusicXMLParser.parseResult');

  static parse(xmlStr: string): XMLNode {
    return MusicXMLParser.parseResult;
  }
}
