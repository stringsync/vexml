import { NamedElement } from './namedelement';
import { Score } from './score';

/**
 * A wrapper around a root node that corresponds to a MusicXML document.
 *
 * See https://www.w3.org/2021/06/musicxml40/
 */
export class MusicXml {
  constructor(private root: Document) {}

  /** Returns the first <score-partwise> of the document or null when missing. */
  getScorePartwise(): Score | null {
    const node = this.root.getElementsByTagName('score-partwise').item(0);
    if (!node) {
      return null;
    }
    return new Score(NamedElement.of(node));
  }
}
