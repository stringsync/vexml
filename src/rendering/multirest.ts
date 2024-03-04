import * as vexflow from 'vexflow';
import { TimeSignature } from './timesignature';
import { Clef } from './clef';
import { Rest } from './rest';
import { Config } from '.';
import { Address } from './address';
import { Spanners } from './spanners';
import { Voice, VoiceRendering } from './voice';

export type MeasureRestRendering = SingleMeasureRestRendering | MultiMeasureRestRendering;

export type SingleMeasureRestRendering = {
  type: 'measurerest';
  coverage: 'single';
  voice: VoiceRendering;
};

export type MultiMeasureRestRendering = {
  type: 'measurerest';
  coverage: 'multi';
  vexflow: {
    multiMeasureRest: vexflow.MultiMeasureRest;
  };
};

/** Represents a rest that spans at least one measure. */
export class MeasureRest {
  private config: Config;
  private count: number;
  private timeSignature: TimeSignature;
  private clef: Clef;

  constructor(opts: { config: Config; count: number; timeSignature: TimeSignature; clef: Clef }) {
    this.config = opts.config;
    this.count = opts.count;
    this.timeSignature = opts.timeSignature;
    this.clef = opts.clef;
  }

  /** Returns the number of measures the measure rest is active for. 0 means there's no multi rest. */
  getCount(): number {
    return this.count;
  }

  /** Renders the Multi Measure Rest */
  render(opts: { address: Address<'chorus'>; spanners: Spanners }): MeasureRestRendering {
    if (this.count === 1) {
      return this.renderSingleMeasureRest({
        address: opts.address.voice({ voiceIndex: -1 }),
        spanners: opts.spanners,
      });
    } else {
      return this.renderMultiMeasureRest();
    }
  }

  private renderSingleMeasureRest(opts: { address: Address<'voice'>; spanners: Spanners }): SingleMeasureRestRendering {
    const rest = Rest.whole({ config: this.config, clef: this.clef });
    const voice = new Voice({ config: this.config, id: '-1', entries: [rest], timeSignature: this.timeSignature });

    return {
      type: 'measurerest',
      coverage: 'single',
      voice: voice.render({
        address: opts.address,
        spanners: opts.spanners,
      }),
    };
  }

  private renderMultiMeasureRest(): MultiMeasureRestRendering {
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
