import { NamedNode } from './namednode';
import * as parse from './parse';

/**
 * Key represents a key signature.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/key/
 */
export class Key {
  constructor(private node: NamedNode<'key'>) {}

  /** Returns the fifths count of the key or defaults to 0. */
  getFifthsCount(): number {
    const fifths = this.node.asElement().getElementsByTagName('fifths').item(0)?.textContent;
    return parse.intOrDefault(fifths, 0);
  }
}
