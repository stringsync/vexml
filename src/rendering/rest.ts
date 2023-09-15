import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Config } from './config';

export type RestRendering = {
  type: 'rest';
  vexflow: {
    staveNote: vexflow.StaveNote;
  };
};

export class Rest {
  private config: Config;
  private durationDenominator: musicxml.NoteDurationDenominator;
  private dotCount: number;
  private clefType: musicxml.ClefType;

  private constructor(opts: {
    config: Config;
    durationDenominator: musicxml.NoteDurationDenominator;
    dotCount: number;
    clefType: musicxml.ClefType;
  }) {
    this.config = opts.config;
    this.durationDenominator = opts.durationDenominator;
    this.dotCount = opts.dotCount;
    this.clefType = opts.clefType;
  }

  static create(opts: {
    config: Config;
    musicXml: {
      note: musicxml.Note;
    };
    clefType: musicxml.ClefType;
  }): Rest {
    const note = opts.musicXml.note;

    return new Rest({
      config: opts.config,
      durationDenominator: note.getDurationDenominator(),
      dotCount: note.getDotCount(),
      clefType: opts.clefType,
    });
  }

  clone(): Rest {
    return new Rest({
      config: this.config,
      durationDenominator: this.durationDenominator,
      dotCount: this.dotCount,
      clefType: this.clefType,
    });
  }

  render(): RestRendering {
    const vfStaveNote = this.toVexflowStaveNote();
    return { type: 'rest', vexflow: { staveNote: vfStaveNote } };
  }

  private toVexflowStaveNote(): vexflow.StaveNote {
    return new vexflow.StaveNote({
      keys: [this.getKey()],
      duration: `${this.durationDenominator}r`,
      dots: this.dotCount,
      clef: this.clefType,
    });
  }

  private getKey(): string {
    switch (this.clefType) {
      case 'bass':
        return 'D/2';
      default:
        return 'B/4';
    }
  }
}
