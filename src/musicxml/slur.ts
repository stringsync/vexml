import { NamedElement } from '@/util';
import { ABOVE_BELOW, AboveBelow, LINE_TYPES, LineType, START_STOP_CONTINUE, StartStopContinue } from './enums';

/**
 * Most slurs are represented with two <slur> elements: one with a start type, and one with a stop type.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/slur/
 */
export class Slur {
  constructor(private element: NamedElement<'slur'>) {}

  /** Returns the type of slur. Defaults to null. */
  getType(): StartStopContinue | null {
    return this.element.attr('type').enum(START_STOP_CONTINUE);
  }

  /** Returns the placement of the slur. Defaults to null. */
  getPlacement(): AboveBelow | null {
    return this.element.attr('placement').enum(ABOVE_BELOW);
  }

  /** Returns the number of the slur. Defaults to 1. */
  getNumber(): number {
    return this.element.attr('number').withDefault(1).int();
  }

  /** Returns the line type of the slur. Defaults to solid. */
  getLineType(): LineType {
    return this.element.attr('line-type').withDefault<LineType>('solid').enum(LINE_TYPES);
  }
}
