import { NamedElement } from '../util';
import { ABOVE_BELOW, AboveBelow, START_STOP_CONTINUE, StartStopContinue } from './enums';

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
}
