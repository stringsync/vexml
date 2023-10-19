import { NamedElement } from '../util';
import { Metronome } from './metronome';

/**
 * Non-exhaustive _supported_ options that the `<direction-type>` can contain.
 */
export type DirectionTypeContent =
  | {
      type: 'empty';
    }
  | {
      type: 'unsupported';
      tagNames: string[];
    }
  | {
      type: 'metronome';
      metronome: Metronome;
    };

/**
 * Represents the type of direction.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/direction-type/.
 */
export class DirectionType {
  constructor(private element: NamedElement<'direction-type'>) {}

  /** Returns the content of the direction type. */
  getContent(): DirectionTypeContent {
    const children = this.element.children();
    const first = children[0];

    if (typeof first === 'undefined') {
      return { type: 'empty' };
    }

    if (first.isNamed('metronome')) {
      return {
        type: 'metronome',
        metronome: new Metronome(first),
      };
    }

    return {
      type: 'unsupported',
      tagNames: children.map((child) => child.name),
    };
  }
}
