import * as debug from '@/debug';
import { Config } from '@/config';
import * as vexflow from 'vexflow';
import { Address } from './address';

export type MultiRestRendering = {
  type: 'measurerest';
  coverage: 'multi';
  address: Address<'stave'>;
  vexflow: {
    multiMeasureRest: vexflow.MultiMeasureRest;
  };
};

/** Represents a rest that spans at least one measure. */
export class MultiRest {
  private config: Config;
  private log: debug.Logger;
  private count: number;

  constructor(opts: { config: Config; log: debug.Logger; count: number }) {
    this.config = opts.config;
    this.log = opts.log;
    this.count = opts.count;
  }

  /** Renders the Multi Measure Rest */
  render(opts: { address: Address<'stave'> }): MultiRestRendering {
    this.log.debug('rendering multi-measure rest', { count: this.count });

    const vfMultiMeasureRest = new vexflow.MultiMeasureRest(this.count, {
      numberOfMeasures: 1,
    });

    return {
      type: 'measurerest',
      coverage: 'multi',
      address: opts.address,
      vexflow: {
        multiMeasureRest: vfMultiMeasureRest,
      },
    };
  }
}
