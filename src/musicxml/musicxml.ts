import * as errors from '@/errors';
import { NamedElement } from '@/util';
import { ScorePartwise } from './scorepartwise';

/**
 * A wrapper around a root node that corresponds to a MusicXML document.
 *
 * See https://www.w3.org/2021/06/musicxml40/
 */
export class MusicXML {
  constructor(private root: Document) {}

  /**
   * Returns the first <score-partwise> of the document.
   *
   * @throws {errors.ParseError} when the root does not contain a <score-partwise> element. It does not check for deep validity.
   */
  getScorePartwise(): ScorePartwise {
    const node = this.root.getElementsByTagName('score-partwise').item(0);
    if (!node) {
      throw new errors.ParseError('could not find a <score-partwise> element');
    }
    return new ScorePartwise(NamedElement.of(node));
  }

  /** Returns the string representation of the document. */
  getDocumentString(): string {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(this.root);
  }
}
