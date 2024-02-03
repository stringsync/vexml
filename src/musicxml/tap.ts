import { NamedElement } from '@/util';

/**
 * The `<tap>` element indicates a tap on the fretboard.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/technical/
 */
export class Tap {
  constructor(private element: NamedElement<'tap'>) {}

  /** Returns the symbol for the tap. Defaults to 'T'. */
  getSymbol(): string {
    return this.element.content().withDefault('T').str();
  }
}
