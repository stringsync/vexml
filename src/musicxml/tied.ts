import { NamedElement } from '@/util';
import { ABOVE_BELOW, AboveBelow, LINE_TYPES, LineType, TIED_TYPES, TiedType } from './enums';

/**
 * The <tied> element represents the notated tie.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/tied/.
 */
export class Tied {
  constructor(private element: NamedElement<'tied'>) {}

  /** Returns the type of tie. Defaults to null. */
  getType(): TiedType | null {
    return this.element.attr('type').enum(TIED_TYPES);
  }

  /** Returns the placement of the tie. Defaults to null. */
  getPlacement(): AboveBelow | null {
    return this.element.attr('placement').enum(ABOVE_BELOW);
  }

  /** Returns the number of the tie. Defaults to 1. */
  getNumber(): number {
    return this.element.attr('number').withDefault(1).int();
  }

  /** Returns the line type of the tie. Defaults to solid. */
  getLineType(): LineType {
    return this.element.attr('line-type').withDefault<LineType>('solid').enum(LINE_TYPES);
  }
}
