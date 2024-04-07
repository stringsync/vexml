import { NamedElement } from '@/util';
import { ABOVE_BELOW, AboveBelow } from './enums';

/**
 * The `<up-bow>` element represents the symbol that is used both for up-bowing on bowed instruments, and up-stroke on
 * plucked instruments.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/up-bow/
 */
export class UpBow {
  constructor(private element: NamedElement<'up-bow'>) {}

  /** Returns the placement of the upbow. Defaults to above. */
  getPlacement(): AboveBelow {
    return this.element.attr('placement').withDefault<AboveBelow>('above').enum(ABOVE_BELOW);
  }
}
