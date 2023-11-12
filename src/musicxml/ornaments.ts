import { NamedElement } from '../util';
import { WavyLine } from './wavyline';

/**
 * Ornaments can be any of several types, followed optionally by accidentals.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/ornaments/.
 */
export class Ornaments {
  constructor(private element: NamedElement<'ornaments'>) {}

  /** Wether the ornaments has a trill mark. */
  hasTrillMark(): boolean {
    return this.element.all('trill-mark').length > 0;
  }

  /** Returns the wavy lines of the ornaments. Defaults to an empty array. */
  getWavyLines(): WavyLine[] {
    return this.element.all('wavy-line').map((element) => new WavyLine(element));
  }
}
