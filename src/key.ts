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

  /** Returns the key signature based on the fifths count. */
  getKeySignature(): string {
    switch (this.getFifthsCount()) {
      case 1:
        return 'G';
      case 2:
        return 'D';
      case 3:
        return 'A';
      case 4:
        return 'E';
      case 5:
        return 'B';
      case 6:
        return 'F#';
      case 7:
        return 'C#';
      case -1:
        return 'F';
      case -2:
        return 'Bb';
      case -3:
        return 'Eb';
      case -4:
        return 'Ab';
      case -5:
        return 'Cb';
      case -6:
        return 'Gb';
      case -7:
        return 'Cb';
      default:
        return 'C';
    }
  }
}
