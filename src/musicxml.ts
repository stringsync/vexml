import { NamedNode } from './namednode';
import { Score } from './score';

export class MusicXml {
  constructor(private root: Document) {}

  /** Returns the first <score-partwise> of the document or null when missing. */
  getScorePartwise(): Score | null {
    const node = this.root.getElementsByTagName('score-partwise').item(0);
    if (!node) {
      return null;
    }
    return new Score(NamedNode.of(node));
  }
}
