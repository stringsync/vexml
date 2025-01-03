import * as data from '@/data';
import * as util from '@/util';

export class Fraction {
  constructor(private fraction: util.Fraction) {}

  parse(): data.Fraction {
    return {
      type: 'fraction',
      numerator: this.fraction.numerator,
      denominator: this.fraction.denominator,
    };
  }
}
