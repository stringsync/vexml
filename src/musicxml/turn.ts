import { NamedElement } from '@/util';

/**
 * The `<turn>` element is the normal turn shape which goes up then down.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/turn/
 */
export class Turn {
  constructor(private element: NamedElement<'turn'>) {}
}
