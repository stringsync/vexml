import { NamedNode } from './namednode';

export class Attributes {
  constructor(private node: NamedNode<'attributes'>) {}

  /** Returns the number of staves. */
  getStaveCount(): number {
    const staves = this.node.asElement().getElementsByTagName('staves')?.item(0);
    if (!staves) {
      return 0;
    }

    const textContent = staves.textContent;
    if (!textContent) {
      return 0;
    }

    const staveCount = parseInt(textContent, 10);
    if (isNaN(staveCount)) {
      return 0;
    }

    return staveCount;
  }
}
