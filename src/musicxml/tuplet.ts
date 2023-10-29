import { NamedElement } from '@/util';
import { TUPLET_PLACEMENTS, TUPLET_TYPES, TupletPlacement, TupletType } from './enums';

/**
 * A <tuplet> element is present when a tuplet is to be displayed graphically, in addition to the sound data provided by
 * the <time-modification> elements.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/tuplet/.
 */
export class Tuplet {
  constructor(private element: NamedElement<'tuplet'>) {}

  /** Returns the type of tuplet. */
  getType(): TupletType | null {
    return this.element.attr('type').enum(TUPLET_TYPES);
  }

  /** Returns the placement of the tuplet. Defaults to 'below'. */
  getPlacement(): TupletPlacement | null {
    return this.element.attr('placement').enum(TUPLET_PLACEMENTS);
  }
}
