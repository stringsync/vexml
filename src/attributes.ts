import { NamedNode } from './namednode';
import * as parse from './parse';

// TODO: The relationship between <measure> and <attributes> is one-to-many. Support mid-measure attributes changes.
// See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/measure-partwise/

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

  /** Returns the beats, which is the numerator of the time signature. Defaults to 4. */
  getBeats(): string {
    return this.node.asElement().getElementsByTagName('beats').item(0)?.textContent ?? '4';
  }

  /** Returns the beat type, which is the denominator of the time signature. Defaults to 4. */
  getBeatType(): string {
    return this.node.asElement().getElementsByTagName('beat-type').item(0)?.textContent ?? '4';
  }
}
