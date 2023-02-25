import { Clef } from './clef';
import { Key } from './key';
import { NamedElement } from './namedelement';
import * as parse from './parse';
import { Time } from './time';

/**
 * Attributes contains musical information that typically changes each measure, such as key and time signatures, clefs,
 * transpositions and staving.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/attributes/
 */
export class Attributes {
  constructor(private element: NamedElement<'attributes'>) {}

  /** Returns the number of staves. */
  getStaveCount(): number {
    return this.element.first('staves')?.content().withDefault(1).int() ?? 1;
  }

  /** Returns the times. */
  getTimes(): Time[] {
    return this.element.all('time').map((element) => new Time(element));
  }

  /** Returns the keys. */
  getKeys(): Key[] {
    return this.element.all('key').map((element) => new Key(element));
  }

  /** Returns the clefs. */
  getClefs(): Clef[] {
    return this.element.all('clef').map((element) => new Clef(element));
  }
}
