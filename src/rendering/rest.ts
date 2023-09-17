import * as musicxml from '@/musicxml';
import * as vexflow from 'vxflw-early-access';
import { Config } from './config';

/** The result of rendering a Rest. */
export type RestRendering = {
  type: 'rest';
  vexflow: {
    staveNote: vexflow.StaveNote;
  };
};

/**
 * Represents a musical rest, denoting a pause or silence in the music.
 *
 * The `Rest` class encapsulates the absence of sound within a specific duration in music notation. Just as notes define
 * when and how sound is produced, rests define when it's deliberately not. Each rest, much like its note counterpart,
 * has a rhythmic value determining its length.
 *
 * In musical compositions, rests play an essential role in shaping the music's rhythm, phrasing, and overall dynamics,
 * allowing for moments of reflection or anticipation.
 */
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

  /** Creates the Rest. */
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

  /** Clones the Rest. */
  clone(): Rest {
    return new Rest({
      config: this.config,
      durationDenominator: this.durationDenominator,
      dotCount: this.dotCount,
      clefType: this.clefType,
    });
  }

  /** Renders the Rest. */
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
