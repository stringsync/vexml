import * as data from '@/data';
import * as util from '@/util';
import { Fraction } from './fraction';
import { DynamicType } from './enums';

export class Dynamics {
  constructor(private measureBeat: util.Fraction, private dynamicType: DynamicType) {}

  parse(): data.Dynamics {
    const duration = new Fraction(util.Fraction.zero()).parse();
    const measureBeat = new Fraction(this.measureBeat).parse();

    return {
      type: 'dynamics',
      duration,
      dynamicType: this.dynamicType,
      measureBeat,
    };
  }
}
