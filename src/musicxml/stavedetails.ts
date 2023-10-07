import { NamedElement } from '@/util';
import { STAVE_TYPES, StaveType } from './enums';

/**
 * Indicates different stave types. A stave is the set of five horizontal lines where notes and other musical
 * symbols are placed.
 *
 * https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/staff-details/
 */
export class StaveDetails {
  constructor(private element: NamedElement<'staff-details'>) {}

  /** Returns the staff type. */
  getStaveType(): StaveType {
    return this.element.first('staff-type')?.content().enum(STAVE_TYPES) ?? 'regular';
  }

  /** Returns the number of the staff. */
  getStaffNumber(): number {
    return this.element.attr('number').withDefault(1).int();
  }

  /** Returns the number of lines of the staff. */
  getStaffLines(): number {
    return this.element.first('staff-lines')?.content().withDefault(5).int() ?? 5;
  }
}
