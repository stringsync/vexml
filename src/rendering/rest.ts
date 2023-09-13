import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';

type RestCreateOptions = {
  musicXml: {
    note: musicxml.Note;
  };
  clefType: musicxml.ClefType;
};

type RestConstructorOptions = {
  durationDenominator: musicxml.NoteDurationDenominator;
  dotCount: number;
  clefType: musicxml.ClefType;
};

export type RestRendering = {
  type: 'rest';
  vexflow: {
    staveNote: vexflow.StaveNote;
  };
};

export class Rest {
  static create(opts: RestCreateOptions): Rest {
    const note = opts.musicXml.note;

    return new Rest({
      durationDenominator: note.getDurationDenominator(),
      dotCount: note.getDotCount(),
      clefType: opts.clefType,
    });
  }

  private durationDenominator: musicxml.NoteDurationDenominator;
  private dotCount: number;
  private clefType: musicxml.ClefType;

  private constructor(opts: RestConstructorOptions) {
    this.durationDenominator = opts.durationDenominator;
    this.dotCount = opts.dotCount;
    this.clefType = opts.clefType;
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
