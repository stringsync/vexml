import { NamedElement } from '@/util';

/**
 * The `<tremolo>` element can be used to indicate single-note, double-note, or unmeasured tremolos.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/tremolo/
 */
export class Tremolo {
  constructor(private element: NamedElement<'tremolo'>) {}

  /** Returns the number of tremolo marks. Defaults to 0. */
  getTremoloMarksCount(): number {
    return this.element.content().withDefault(0).int();
  }
}
