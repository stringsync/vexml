import { Measure } from './measure';
import { NamedNode } from './namednode';

export class Part {
  constructor(private node: NamedNode<'part'>) {}

  /** Returns the ID of the part or an empty string if missing. */
  getId(): string {
    return this.node.asElement().getAttribute('id') ?? '';
  }

  /** Returns an array of measures in the order they appear. */
  getMeasures(): Measure[] {
    return Array.from(this.node.asElement().getElementsByTagName('measure'))
      .map((measure) => NamedNode.of<'measure'>(measure))
      .map((node) => new Measure(node));
  }
}
