import * as vexflow from 'vexflow';

export type MultiRestRendering = {
  type: 'multirest';
  vexflow: {
    multiMeasureRest: vexflow.MultiMeasureRest;
  };
};

/** Represents a rest that spans multiple measures. */
export class MultiRest {
  private count: number;

  private constructor(opts: { count: number }) {
    this.count = opts.count;
  }

  /** Creates a Multi Measure Rest. */
  static create(opts: { count: number }): MultiRest {
    return new MultiRest({ count: opts.count });
  }

  /** Returns the number of measures the multi rest is active for. 0 means there's no multi rest. */
  getCount(): number {
    return this.count;
  }

  /** Renders the Multi Measure Rest */
  render(): MultiRestRendering {
    const vfMultiMeasureRest = new vexflow.MultiMeasureRest(this.count, {
      numberOfMeasures: 1,
    });

    return {
      type: 'multirest',
      vexflow: {
        multiMeasureRest: vfMultiMeasureRest,
      },
    };
  }
}
