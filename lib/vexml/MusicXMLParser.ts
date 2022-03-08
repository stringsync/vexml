// TODO(jaredjj3/vexml#1): Formalize a node definition.
type XMLNode = any;

export class MusicXMLParser {
  static parseResult = Symbol('MusicXMLParser.parseResult');

  static parse(xmlStr: string): XMLNode {
    return MusicXMLParser.parseResult;
  }
}
