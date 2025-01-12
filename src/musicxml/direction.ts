import * as util from '@/util';
import { OctaveShift } from './octaveshift';
import { NamedElement } from '@/util';
import {
  CodaDirectionTypeContent,
  DirectionType,
  DynamicsDirectionTypeContent,
  MetronomeDirectionTypeContent,
  OctaveShiftDirectionTypeContent,
  PedalDirectionTypeContent,
  SegnoDirectionTypeContent,
  TokensDirectionTypeContent,
  WedgeDirectionTypeContent,
} from './directiontype';
import { ABOVE_BELOW, AboveBelow } from './enums';
import { Dynamics } from './dynamics';
import { Metronome } from './metronome';
import { Segno } from './segno';
import { Coda } from './coda';
import { Words } from './words';
import { Symbolic } from './symbolic';
import { Wedge } from './wedge';
import { Pedal } from './pedal';

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
   * There should be at least one, but will default to an empty array.
   */
  getTypes(): DirectionType[] {
    return this.element.all('direction-type').map((node) => new DirectionType(node));
  }

  /** Returns the segnos of the direction. */
  getSegnos(): Segno[] {
    return this.getTypes()
      .map((type) => type.getContent())
      .filter((content): content is SegnoDirectionTypeContent => content.type === 'segno')
      .flatMap((content) => content.segnos);
  }

  /** Returns the codas of the direction. */
  getCodas(): Coda[] {
    return this.getTypes()
      .map((type) => type.getContent())
      .filter((content): content is CodaDirectionTypeContent => content.type === 'coda')
      .flatMap((content) => content.codas);
  }

  /** Returns the octave shifts of the direction. */
  getOctaveShifts(): OctaveShift[] {
    return this.getTypes()
      .map((type) => type.getContent())
      .filter((content): content is OctaveShiftDirectionTypeContent => content.type === 'octaveshift')
      .map((content) => content.octaveShift);
  }

  /** Returns the dynamics of the direction. */
  getDynamics(): Dynamics[] {
    return this.getTypes()
      .map((type) => type.getContent())
      .filter((content): content is DynamicsDirectionTypeContent => content.type === 'dynamics')
      .flatMap((content) => content.dynamics);
  }

  /** Returns the metronomes of the direction. */
  getMetronome(): Metronome | null {
    return util.first(
      this.getTypes()
        .map((type) => type.getContent())
        .filter((content): content is MetronomeDirectionTypeContent => content.type === 'metronome')
        .flatMap((content) => content.metronome)
    );
  }

  /** Returns the tokens of the direction. */
  getTokens(): Array<Words | Symbolic> {
    return this.getTypes()
      .map((type) => type.getContent())
      .filter((content): content is TokensDirectionTypeContent => content.type === 'tokens')
      .flatMap((content) => content.tokens);
  }

  /** Returns the wedges of the direction. */
  getWedges(): Wedge[] {
    return this.getTypes()
      .map((type) => type.getContent())
      .filter((content): content is WedgeDirectionTypeContent => content.type === 'wedge')
      .map((content) => content.wedge);
  }

  /** Returns the pedals of the direction. */
  getPedals(): Pedal[] {
    return this.getTypes()
      .map((type) => type.getContent())
      .filter((content): content is PedalDirectionTypeContent => content.type === 'pedal')
      .map((content) => content.pedal);
  }

  /**
   * Returns the placement of the direction. Defaults to null.
   *
   * This is not universally applicable to all `<direction>` children. When a child specifies a placement, it overrides
   * this specification.
   */
  getPlacement(): AboveBelow | null {
    return this.element.attr('placement').enum(ABOVE_BELOW);
  }

  /** Returns the voice this direction belongs to. Defaults to null. */
  getVoice(): string | null {
    return this.element.first('voice')?.content().str() ?? null;
  }

  /** Returns the staff this direction belongs to. Defaults to null. */
  getStaveNumber(): number | null {
    return this.element.first('staff')?.content().int() ?? null;
  }
}
