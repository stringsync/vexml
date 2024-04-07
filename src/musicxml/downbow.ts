import { NamedElement } from '@/util';
import { ABOVE_BELOW, AboveBelow } from './enums';

/**
 * The `<down-bow>` element represents the symbol that is used both for down-bowing on bowed instruments, and
 * down-stroke on plucked instruments.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/down-bow/
 */
export class DownBow {
  constructor(private element: NamedElement<'down-bow'>) {}

  /** Returns the placement of the upbow. Defaults to above. */
  getPlacement(): AboveBelow {
    return this.element.attr('placement').withDefault<AboveBelow>('above').enum(ABOVE_BELOW);
  }
}
