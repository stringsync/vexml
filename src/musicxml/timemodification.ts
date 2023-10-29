import { NamedElement } from '@/util';

/**
 * Time modification indicates tuplets, double-note tremolos, and other durational changes.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/time-modification/
 */
export class TimeModification {
  constructor(private element: NamedElement<'time-modification'>) {}

  /** Describes how many notes are played in the time usually occupied by the number in the `<normal-notes>` element. */
  getActualNotes(): number {
    return this.element.first('actual-notes')?.content().int() ?? 1;
  }

  /** Describes how many notes are usually played in the time occupied by the number in the `<actual-notes>` element. */
  getNormalNotes(): number {
    return this.element.first('normal-notes')?.content().int() ?? 1;
  }
}
