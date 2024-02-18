import { NamedElement } from '../util';
import { Metronome } from './metronome';
import { OctaveShift } from './octaveshift';
import { Pedal } from './pedal';
import { Rehearsal } from './rehearsal';
import { Segno } from './segno';
import { Symbolic } from './symbolic';
import { Wedge } from './wedge';
import { Words } from './words';

export type RehearsalDirectionTypeContent = {
  type: 'rehearsal';
  rehearsals: Array<Rehearsal>;
};

export type SegnoDirectionTypeContent = {
  type: 'segno';
  segnos: Array<Segno>;
};

export type EmptyDirectionTypeContent = {
  type: 'empty';
};

export type UnsupportedDirectionTypeContent = {
  type: 'unsupported';
  tagNames: string[];
};

export type MetronomeDirectionTypeContent = {
  type: 'metronome';
  metronome: Metronome;
};

export type TokensDirectionTypeContent = {
  type: 'tokens';
  tokens: Array<Words | Symbolic>;
};

export type WedgeDirectionTypeContent = {
  type: 'wedge';
  wedge: Wedge;
};

export type OctaveShiftDirectionTypeContent = {
  type: 'octaveshift';
  octaveShift: OctaveShift;
};

export type PedalDirectionTypeContent = {
  type: 'pedal';
  pedal: Pedal;
};

/** Non-exhaustive _supported_ options that the `<direction-type>` can contain. */
export type DirectionTypeContent =
  | RehearsalDirectionTypeContent
  | EmptyDirectionTypeContent
  | UnsupportedDirectionTypeContent
  | WedgeDirectionTypeContent
  | MetronomeDirectionTypeContent
  | OctaveShiftDirectionTypeContent
  | PedalDirectionTypeContent
  | TokensDirectionTypeContent
  | SegnoDirectionTypeContent;

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

    if (first.isNamed('rehearsal')) {
      return {
        type: 'rehearsal',
        rehearsals: children
          .filter((child): child is NamedElement<'rehearsal'> => child.isNamed('rehearsal'))
          .map((child) => new Rehearsal(child)),
      };
    }

    if (first.isNamed('segno')) {
      return {
        type: 'segno',
        segnos: children
          .filter((child): child is NamedElement<'segno'> => child.isNamed('segno'))
          .map((child) => new Segno(child)),
      };
    }

    if (first.isNamed('metronome')) {
      return {
        type: 'metronome',
        metronome: new Metronome(first),
      };
    }

    if (first.isNamed('octave-shift')) {
      return {
        type: 'octaveshift',
        octaveShift: new OctaveShift(first),
      };
    }

    if (first.isNamed('wedge')) {
      return {
        type: 'wedge',
        wedge: new Wedge(first),
      };
    }

    if (first.isNamed('pedal')) {
      return {
        type: 'pedal',
        pedal: new Pedal(first),
      };
    }

    if (first.isNamed('words') || first.isNamed('symbol')) {
      return {
        type: 'tokens',
        tokens: children
          .filter(
            (child): child is NamedElement<'words'> | NamedElement<'symbol'> =>
              child.isNamed('words') || child.isNamed('symbol')
          )
          .map((child) => (child.isNamed('words') ? new Words(child) : new Symbolic(child))),
      };
    }

    return {
      type: 'unsupported',
      tagNames: children.map((child) => child.name),
    };
  }
}
