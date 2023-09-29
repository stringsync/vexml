import * as vexflow from 'vexflow';

export type MultiRestRendering = {
  type: 'multirest';
  vexflow: {
    multiMeasureRest: vexflow.MultiMeasureRest;
  };
};

export class MultiRest {
  private count: number;

  private constructor(opts: { count: number }) {
    this.count = opts.count;
  }

  /** Creates a Multi Measure Rest. */
  static create(opts: { count: number }): MultiRest {
    return new MultiRest({ count: opts.count });
  }

  /** Clones the Multi Measure Rest. */
  clone(): MultiRest {
    return new MultiRest({ count: this.count });
  }

  /** Renders the Multi Measure Rest */
  render(): MultiRestRendering {
    const vfMultiMeasureRest = new vexflow.MultiMeasureRest(this.count, {
      numberOfMeasures: this.count,
    });

    return {
      type: 'multirest',
      vexflow: {
        multiMeasureRest: vfMultiMeasureRest,
      },
    };
  }
}
