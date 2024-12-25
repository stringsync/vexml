import { NamedElement } from '../util';

/**
 * Coordinates multiple voices in a single part.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/forward/.
 */
export class Forward {
  constructor(private element: NamedElement<'forward'>) {}

  /** Returns the duration of the backup. Defaults to 4 */
  getDuration(): number {
    return this.element.first('duration')?.content().int() ?? 4;
  }
}
