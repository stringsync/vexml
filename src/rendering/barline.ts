import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Config } from './config';

/** The result of rendering a barline. */
export type BarlineRendering = {
  type: 'barline';
  vexflow: {
    barlineType: vexflow.BarlineType;
    staveConnectorType: vexflow.StaveConnectorType;
  };
};

export type BarlineType = 'single' | 'double-same' | 'double-different' | 'repeat' | 'none';

export type BarlineLocation = 'left' | 'middle' | 'right';

export class Barline {
  private config: Config;
  private type: BarlineType;
  private location: BarlineLocation;

  constructor(opts: { config: Config; type: BarlineType; location: BarlineLocation }) {
    this.config = opts.config;
    this.type = opts.type;
    this.location = opts.location;
  }

  static fromMusicXML(opts: { config: Config; musicXML: { barline: musicxml.Barline } }) {
    let barlineType: BarlineType = 'none';

    const barline = opts.musicXML.barline;
    if (barline.isRepeat()) {
      barlineType = 'repeat';
    } else {
      switch (barline.getBarStyle()) {
        case 'regular':
        case 'short':
        case 'dashed':
        case 'dotted':
        case 'heavy':
          barlineType = 'single';
          break;
        case 'heavy-heavy':
        case 'light-light':
          barlineType = 'double-same';
          break;
        case 'heavy-light':
        case 'light-heavy':
          barlineType = 'double-different';
          break;
      }
    }

    let location: BarlineLocation;
    switch (barline.getLocation()) {
      case 'left':
        location = 'left';
        break;
      case 'middle':
        location = 'middle';
        break;
      case 'right':
        location = 'right';
        break;
    }

    return new Barline({
      config: opts.config,
      type: barlineType,
      location: location,
    });
  }

  /** Returns the type of the barline. */
  getType(): BarlineType {
    return this.type;
  }

  /** Returns the width of the barline. */
  getWidth(): number {
    return this.type === 'none' ? 0 : 1;
  }

  /** Renders the barline. */
  render(): BarlineRendering {
    return {
      type: 'barline',
      vexflow: {
        barlineType: this.getVfBarlineType(),
        staveConnectorType: this.getVfStaveConnectorType(),
      },
    };
  }

  private getVfBarlineType(): vexflow.BarlineType {
    switch (this.type) {
      case 'single':
        return vexflow.Barline.type.SINGLE;
      case 'double-same':
        return vexflow.Barline.type.DOUBLE;
      case 'double-different':
        switch (this.location) {
          case 'left':
          case 'middle':
            return vexflow.Barline.type.DOUBLE;
          case 'right':
            return vexflow.Barline.type.END;
        }
        break;
      case 'repeat':
        switch (this.location) {
          case 'left':
            return vexflow.Barline.type.REPEAT_BEGIN;
          case 'middle':
            return vexflow.Barline.type.REPEAT_BOTH;
          case 'right':
            return vexflow.Barline.type.REPEAT_END;
        }
        break;
      case 'none':
        return vexflow.Barline.type.NONE;
    }
  }

  private getVfStaveConnectorType(): vexflow.StaveConnectorType {
    switch (this.type) {
      case 'single':
        switch (this.location) {
          case 'left':
            return 'singleLeft';
          case 'middle':
            return 'single';
          case 'right':
            return 'singleRight';
        }
        break;
      case 'double-same':
        return 'double';
      case 'double-different':
        switch (this.location) {
          case 'left':
            return 'boldDoubleLeft';
          case 'middle':
            return 'double';
          case 'right':
            return 'boldDoubleRight';
        }
        break;
      case 'repeat':
        switch (this.location) {
          case 'left':
            return 'boldDoubleLeft';
          case 'middle':
            return 'double';
          case 'right':
            return 'boldDoubleRight';
        }
        break;
      default:
        return 'none';
    }
  }
}
