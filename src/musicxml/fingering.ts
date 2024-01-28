import { NamedElement } from '@/util';

/**
 * Fingering is typically indicated 1, 2, 3, 4, 5. Multiple fingerings may be given, typically to substitute
 * fingerings in the middle of a note. For guitar and other fretted instruments, the `<fingering>` element
 * represents the fretting finger; the `<pluck>` element represents the plucking finger.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/fingering/
 */
export class Fingering {
  constructor(private element: NamedElement<'fingering'>) {}

  /** Returns the fingering number. Defaults to null. */
  getNumber(): number | null {
    return this.element.content().int();
  }
}
