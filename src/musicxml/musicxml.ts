import { NamedElement } from '@/util';
import { ScorePartwise } from './scorepartwise';

/**
 * A wrapper around a root node that corresponds to a MusicXML document.
 *
 * See https://www.w3.org/2021/06/musicxml40/
 */
export class MusicXml {
  constructor(private root: Document) {}

  /**
   * Returns the first <score-partwise> of the document.
   *
   * @throws {Error} when the root does not contain a <score-partwise> element. It does not check for deep validity.
   */
  getScorePartwise(): ScorePartwise {
    const node = this.root.getElementsByTagName('score-partwise').item(0);
    if (!node) {
      throw new Error('could not find a <score-partwise> element');
    }
    return new ScorePartwise(NamedElement.of(node));
  }
}
