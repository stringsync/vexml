import { XMLNode } from "./types";

export class MusicXMLParser {
  static parseResult = Symbol('MusicXMLParser.parseResult');

  static parse(musicXml: string): XMLNode {
    return MusicXMLParser.parseResult;
  }
}
