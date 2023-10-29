import { NamedElement } from '../util';
import { SLUR_PLACEMENTS, SLUR_TYPES, SlurPlacement, SlurType } from './enums';

/**
 * Most slurs are represented with two <slur> elements: one with a start type, and one with a stop type.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/slur/
 */
export class Slur {
  constructor(private element: NamedElement<'slur'>) {}

  /** Returns the type of slur. Defaults to null. */
  getType(): SlurType | null {
    return this.element.attr('type').enum(SLUR_TYPES);
  }

  /** Returns the placement of the slur. Defaults to null. */
  getPlacement(): SlurPlacement | null {
    return this.element.attr('placement').enum(SLUR_PLACEMENTS);
  }
}
