import { NamedElement } from '@/util';

/**
 * The `<string>` element is used with tablature notation, regular notation (where it is often circled), and chord
 * diagrams. String numbers start with 1 for the highest pitched full-length string.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/string/
 */
export class String {
  constructor(private element: NamedElement<'string'>) {}

  /** Returns the number of the string. */
  getNumber(): number | null {
    return this.element.content().int();
  }
}
