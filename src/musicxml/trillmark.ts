import { NamedElement } from '../util';

/**
 * The <trill-mark> element represents the trill symbol.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/trill-mark/
 */
export class TrillMark {
  constructor(private element: NamedElement<'trill-mark'>) {}
}
