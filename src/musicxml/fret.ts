import { NamedElement } from '@/util';

/**
 * The `<fret>` element is used with tablature notation and chord diagrams. Fret numbers start with 0 for an open string
 * and 1 for the first fret.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/fret/
 */
export class Fret {
  constructor(private element: NamedElement<'fret'>) {}

  /** Returns the number of the fret. */
  getNumber(): number | null {
    return this.element.content().int();
  }
}
