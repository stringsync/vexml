import { NamedElement } from '../util';
import { UP_DOWN_STOP_CONTINUE, UpDownStopContinue } from './enums';

/**
 * The <octave-shift> element indicates where notes are shifted up or down from their performed values because of
 * printing difficulty.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/octave-shift/
 */
export class OctaveShift {
  constructor(private element: NamedElement<'octave-shift'>) {}

  /** Returns the octave shift type. Defaults to 'up'. */
  getType(): UpDownStopContinue {
    return this.element.attr('type').withDefault<UpDownStopContinue>('up').enum(UP_DOWN_STOP_CONTINUE);
  }

  /** Returns the size of the octave shift. Defaults to 8. */
  getSize(): number {
    return this.element.attr('size').withDefault(8).int();
  }
}
