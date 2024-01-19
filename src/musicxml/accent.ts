import { NamedElement } from '../util';
import { ABOVE_BELOW, AboveBelow } from './enums';

/**
 * The <accent> element indicates a regular horizontal accent mark.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/accent/
 */
export class Accent {
  constructor(private element: NamedElement<'accent'>) {}

  /** Returns the placement of the accent. Defaults to above. */
  getPlacement(): AboveBelow {
    return this.element.attr('placement').withDefault<AboveBelow>('above').enum(ABOVE_BELOW);
  }
}
