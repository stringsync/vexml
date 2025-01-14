import * as data from '@/data';
import * as util from '@/util';

export class Fraction {
  constructor(private fraction: util.Fraction) {}

  reify(): util.Fraction {
    return this.fraction;
  }

  parse(): data.Fraction {
    return {
      type: 'fraction',
      numerator: this.fraction.numerator,
      denominator: this.fraction.denominator,
    };
  }
}
