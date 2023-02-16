import { NamedNode } from './namednode';
import * as parse from './parse';

export class Attributes {
  constructor(private node: NamedNode<'attributes'>) {}

  /** Returns the number of staves. */
  getStaveCount(): number {
    const textContent = this.node.asElement().getElementsByTagName('staves')?.item(0)?.textContent;
    return parse.intOrDefault(textContent, 0);
  }
}
