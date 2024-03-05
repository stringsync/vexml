import { NamedElement } from '@/util';
import { DYNAMIC_TYPES, DynamicType } from './enums';

/**
 * Dynamics can be associated either with a note or a general musical direction.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/dynamics/
 */
export class Dynamics {
  constructor(private element: NamedElement<'dynamics'>) {}

  /** Returns the dynamic types associated with this element. */
  getTypes(): DynamicType[] {
    return this.element.children(...DYNAMIC_TYPES.values).map((child) => child.name as DynamicType);
  }
}
