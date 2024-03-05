import { NamedElement } from '@/util';

/**
 * The `<rehearsal>` element specifies letters, numbers, and section names that are notated in the score for reference
 * during rehearsal.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/rehearsal/
 */
export class Rehearsal {
  constructor(private element: NamedElement<'rehearsal'>) {}

  /** Returns the content of the element. */
  getText(): string {
    return this.element.content().withDefault('').str();
  }
}
