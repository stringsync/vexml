import { NamedNode } from './namednode';
import { Score } from './score';

export class Vexml {
  /** Creates a Vexml instance from a MusicXML document as a string. */
  static fromString(musicXml: string): Vexml {
    const parser = new DOMParser();
    const document = parser.parseFromString(musicXml, 'application/xml');
    return Vexml.fromDocument(document);
  }

  /** Creates a Vexml instance from a MusicXML document node. */
  static fromDocument(document: Document): Vexml {
    const elements = document.getElementsByName('score-partwise');
    if (elements.length !== 1) {
      throw new Error(`expected exactly 1 <score-partwise> element, got ${elements.length}`);
    }
    const scorePartwise = NamedNode.of<'score-partwise'>(elements.item(0)!);
    const score = new Score(scorePartwise);
    return new Vexml(score);
  }

  private constructor(private score: Score) {}
}
