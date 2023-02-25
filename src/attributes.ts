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
  constructor(private node: NamedElement<'attributes'>) {}

  /** Returns the number of staves. */
  getStaveCount(): number {
    const textContent = this.node.native().getElementsByTagName('staves')?.item(0)?.textContent;
    return parse.intOrDefault(textContent, 1);
  }

  /** Returns the times. */
  getTimes(): Time[] {
    return Array.from(this.node.native().getElementsByTagName('time'))
      .map((time) => NamedElement.of<'time'>(time))
      .map((node) => new Time(node));
  }

  /** Returns the keys. */
  getKeys(): Key[] {
    return Array.from(this.node.native().getElementsByTagName('key'))
      .map((key) => NamedElement.of<'key'>(key))
      .map((node) => new Key(node));
  }

  /** Returns the clefs. */
  getClefs(): Clef[] {
    return Array.from(this.node.native().getElementsByTagName('clef'))
      .map((clef) => NamedElement.of<'clef'>(clef))
      .map((node) => new Clef(node));
  }
}
