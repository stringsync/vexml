import { NamedElement } from '@/util';

/**
 * The `<inverted-turn>` element has the shape which goes down and then up.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/inverted-turn/
 */
export class InvertedTurn {
  constructor(private element: NamedElement<'inverted-turn'>) {}
}
