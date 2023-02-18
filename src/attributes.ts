import { NamedNode } from './namednode';
import * as parse from './parse';
import { Time } from './time';

/**
 * Attributes contains musical information that typically changes each measure, such as key and time signatures, clefs,
 * transpositions and staving.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/attributes/
 */
export class Attributes {
  constructor(private node: NamedNode<'attributes'>) {}

  /** Returns the number of staves. */
  getStaveCount(): number {
    const textContent = this.node.asElement().getElementsByTagName('staves')?.item(0)?.textContent;
    return parse.intOrDefault(textContent, 0);
  }

  getTimes(): Time[] {
    return Array.from(this.node.asElement().getElementsByTagName('time'))
      .map((time) => NamedNode.of<'time'>(time))
      .map((node) => new Time(node));
  }
}
