import { NamedElement } from '../util';
import { START_STOP_CONTINUE, StartStopContinue } from './enums';

/**
 * Wavy lines are one way to indicate trills and vibrato.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/wavy-line/.
 */
export class WavyLine {
  constructor(private element: NamedElement<'wavy-line'>) {}

  /** Returns the number of the wavy line. Defaults to 1. */
  getNumber(): number {
    return this.element.attr('number').withDefault(1).int();
  }

  /** Returns the type of the wavy line. Defaults to start. */
  getType(): StartStopContinue {
    return this.element.attr('type').withDefault<StartStopContinue>('start').enum(START_STOP_CONTINUE);
  }
}
