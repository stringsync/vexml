import { NamedElement } from '@/util';
import { BendType } from './enums';

/**
 * The `<bend>` element is used in guitar notation and tablature. A single note with a bend and release will contain two
 * `<bend>` elements: the first to represent the bend and the second to represent the release.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/bend/
 */
export class Bend {
  constructor(private element: NamedElement<'bend'>) {}

  /** Returns the number of semitones to bend. */
  getAlter(): number {
    return this.element.attr('alter').withDefault(1).float();
  }

  /** Returns the type of bend. */
  getType(): BendType {
    if (this.element.first('pre-bend')) {
      return 'pre-bend';
    }
    if (this.element.first('release')) {
      return 'release';
    }
    return 'normal';
  }
}
