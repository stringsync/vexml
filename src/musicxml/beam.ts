import { BEAM_VALUES, BeamValue } from './enums';
import { NamedElement, clamp } from '@/util';

/**
 * Beam is a note connector that indicates a rhythmic relationship amongst a group of notes.
 *
 * https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/beam/
 */
export class Beam {
  constructor(private element: NamedElement<'beam'>) {}

  /** Returns the beam level of the beam. */
  getNumber(): number {
    const number = this.element.attr('number').withDefault(1).int();
    return clamp(1, 8, number);
  }

  /** Returns the beam value of the beam. */
  getBeamValue(): BeamValue {
    return this.element.content().withDefault(BEAM_VALUES.values[0]).enum(BEAM_VALUES);
  }
}
