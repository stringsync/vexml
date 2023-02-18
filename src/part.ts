import { Measure } from './measure';
import { NamedNode } from './namednode';

/**
 * The top level of musical organization below the Score that contains a sequence of Measures.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/part-partwise/
 */
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
