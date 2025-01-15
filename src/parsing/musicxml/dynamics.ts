import * as data from '@/data';
import * as util from '@/util';
import { Fraction } from './fraction';
import { DynamicType } from './enums';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class Dynamics {
  constructor(
    private config: Config,
    private log: Logger,
    private measureBeat: util.Fraction,
    private dynamicType: DynamicType
  ) {}

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
