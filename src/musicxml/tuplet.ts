import { NamedElement } from '@/util';
import { ABOVE_BELOW, START_STOP, AboveBelow, StartStop, ShowTuplet, SHOW_TUPLET } from './enums';

/**
 * A <tuplet> element is present when a tuplet is to be displayed graphically, in addition to the sound data provided by
 * the <time-modification> elements.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/tuplet/.
 */
export class Tuplet {
  constructor(private element: NamedElement<'tuplet'>) {}

  /** Returns the type of tuplet. */
  getType(): StartStop | null {
    return this.element.attr('type').enum(START_STOP);
  }

  /** Returns the placement of the tuplet. Defaults to 'below'. */
  getPlacement(): AboveBelow {
    return this.element.attr('placement').enum(ABOVE_BELOW) ?? 'below';
  }

  /** Returns how the tuplet number should be displayed. */
  getShowNumber(): ShowTuplet {
    return this.element.attr('show-number').withDefault<ShowTuplet>('actual').enum(SHOW_TUPLET);
  }
}
