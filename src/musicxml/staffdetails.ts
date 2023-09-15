import { NamedElement } from '@/util';
import { STAFF_TYPES, StaffType } from './enums';

/**
 * Indicates different staff (aka stave) types. A stave is the set of five horizontal lines where notes and other musical
 * symbols are placed.
 *
 * https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/staff-details/
 */
export class StaffDetails {
  constructor(private element: NamedElement<'staff-details'>) {}

  getStaffType(): StaffType {
    return this.element.first('staff-type')?.content().enum(STAFF_TYPES) ?? 'regular';
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
