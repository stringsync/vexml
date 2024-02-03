import { NamedElement } from '@/util';
import { START_STOP, StartStop } from './enums';

/**
 * The `<hammer-on>` element is used in guitar and fretted instrument notation.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/hammer-on/
 */
export class HammerOn {
  constructor(private element: NamedElement<'hammer-on'>) {}

  /** Returns the number of the hammer-on. Defaults to 1. */
  getNumber(): number {
    return this.element.attr('number').withDefault(1).int();
  }

  /** Returns the type of hammer-on. */
  getType(): StartStop | null {
    return this.element.attr('type').enum(START_STOP);
  }
}
