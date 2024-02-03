import { NamedElement } from '@/util';

/**
 * The `<pluck>` element is used to specify the plucking fingering on a fretted instrument, where the fingering element
 * refers to the fretting fingering.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/pluck/
 */
export class Pluck {
  constructor(private element: NamedElement<'pluck'>) {}

  /** Returns the plucking finger. Defaults to null. */
  getFinger(): string | null {
    return this.element.content().str();
  }
}
