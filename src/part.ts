import { Measure } from './measure';
import { NamedElement } from './namedelement';

/**
 * The top level of musical organization below the Score that contains a sequence of Measures.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/part-partwise/
 */
export class Part {
  constructor(private element: NamedElement<'part'>) {}

  /** Returns the ID of the part or an empty string if missing. */
  getId(): string {
    return this.element.attr('id').withDefault('').str();
  }

  /** Returns an array of measures in the order they appear. */
  getMeasures(): Measure[] {
    return this.element.all('measure').map((element) => new Measure(element));
  }
}
