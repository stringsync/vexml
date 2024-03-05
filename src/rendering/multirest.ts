import * as vexflow from 'vexflow';

export type MultiRestRendering = {
  type: 'measurerest';
  coverage: 'multi';
  vexflow: {
    multiMeasureRest: vexflow.MultiMeasureRest;
  };
};

/** Represents a rest that spans at least one measure. */
export class MultiRest {
  private count: number;

  constructor(opts: { count: number }) {
    this.count = opts.count;
  }

  /** Renders the Multi Measure Rest */
  render(): MultiRestRendering {
    const vfMultiMeasureRest = new vexflow.MultiMeasureRest(this.count, {
      numberOfMeasures: 1,
    });

    return {
      type: 'measurerest',
      coverage: 'multi',
      vexflow: {
        multiMeasureRest: vfMultiMeasureRest,
      },
    };
  }
}
