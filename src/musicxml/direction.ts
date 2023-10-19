import { NamedElement } from '../util';
import { DirectionType } from './directiontype';

/**
 * A direction is a musical indication that is not necessarily attached to a specific note.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/direction/
 */
export class Direction {
  constructor(private element: NamedElement<'direction'>) {}

  /**
   * Returns the type of direction.
   *
   * There should be at least one, but will defaults to an empty array.
   */
  getType(): DirectionType[] {
    return this.element.all('direction-type').map((node) => new DirectionType(node));
  }
}
