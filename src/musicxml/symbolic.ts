import { NamedElement } from '@/util';

/**
 * The <symbol> element specifies a musical symbol using a canonical SMuFL glyph name.
 *
 * `Symbol` is part of the standard library in JavaScript, so we resort to `Symbolic` instead.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/symbol/
 */
export class Symbolic {
  constructor(private element: NamedElement<'symbol'>) {}

  /** Returns a specific Standard Music Font Layout (SMuFL) character. Defaults to empty string.  */
  getSmulfGlyphName(): string {
    return this.element.content().withDefault('').str();
  }
}
