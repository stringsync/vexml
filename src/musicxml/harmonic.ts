import { NamedElement } from '@/util';
import { HarmonicPitchType, HarmonicType } from './enums';

/**
 * The `<harmonic>` element indicates natural and artificial harmonics.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/harmonic/
 */
export class Harmonic {
  constructor(private element: NamedElement<'harmonic'>) {}

  /** Returns the type of harmonic. Defaults to 'unspecified'. */
  getType(): HarmonicType {
    if (this.element.first('natural')) {
      return 'natural';
    }
    if (this.element.first('artificial')) {
      return 'artificial';
    }
    return 'unspecified';
  }

  /** Returns the pitch type of the harmonic. Defaults to 'unspecified'. */
  getPitchType(): HarmonicPitchType {
    if (this.element.first('base-pitch')) {
      return 'base';
    }
    if (this.element.first('touching-pitch')) {
      return 'touching';
    }
    if (this.element.first('sounding-pitch')) {
      return 'sounding';
    }
    return 'unspecified';
  }
}
