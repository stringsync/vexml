import { BEAM_VALUES, BeamValue } from './enums';
import { NamedElement } from '../util/namedelement';

export class Beam {
  constructor(private element: NamedElement<'beam'>) {}

  /** Returns the beam level of the beam. */
  getNumber(): number {
    const number = this.element.attr('number').withDefault(1).int();
    return this.clamp(1, 8, number);
  }

  /** Returns the beam value of the beam. */
  getBeamValue(): BeamValue {
    return this.element.content().withDefault(BEAM_VALUES.values[0]).enum(BEAM_VALUES);
  }

  private clamp(min: number, max: number, value: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
