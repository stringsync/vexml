import { NamedElement } from '@/util';
import { WEDGE_TYPES, WedgeType } from './enums';

/**
 * Represents a cescendo or diminuendo wedge symbols.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/wedge/
 */
export class Wedge {
  constructor(private element: NamedElement<'wedge'>) {}

  /** Returns the type of the wedge. Defaults to crescendo. */
  getType(): WedgeType {
    return this.element.attr('wedge-type').withDefault<WedgeType>('crescendo').enum(WEDGE_TYPES);
  }

  /** Indicates the gap between the top and bottom of the wedge. Defaults to 0. */
  getSpread(): number {
    return this.element.attr('spread').withDefault(0).int();
  }
}
