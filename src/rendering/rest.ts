import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Config } from './config';
import { ClefType, NoteDurationDenominator } from './enums';
import { Clef } from './clef';
import { Token } from './token';

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
  private displayPitch: string | null;
  private durationDenominator: NoteDurationDenominator;
  private dotCount: number;
  private clef: Clef;
  private tokens: Token[];

  private constructor(opts: {
    config: Config;
    displayPitch: string | null;
    durationDenominator: NoteDurationDenominator;
    dotCount: number;
    clef: Clef;
    tokens: Token[];
  }) {
    this.config = opts.config;
    this.displayPitch = opts.displayPitch;
    this.durationDenominator = opts.durationDenominator;
    this.dotCount = opts.dotCount;
    this.clef = opts.clef;
    this.tokens = opts.tokens;
  }

  /** Creates the Rest. */
  static create(opts: {
    config: Config;
    musicXml: {
      note: musicxml.Note;
      tokens: Token[];
    };
    durationDenominator: NoteDurationDenominator;
    clef: Clef;
  }): Rest {
    const note = opts.musicXml.note;
    const tokens = opts.musicXml.tokens;

    return new Rest({
      config: opts.config,
      displayPitch: note.getRestDisplayPitch(),
      durationDenominator: opts.durationDenominator,
      dotCount: note.getDotCount(),
      clef: opts.clef,
      tokens,
    });
  }

  /** Creates a whole rest. */
  static whole(opts: { config: Config; clef: Clef }): Rest {
    return new Rest({
      config: opts.config,
      displayPitch: null,
      durationDenominator: '1',
      dotCount: 0,
      clef: opts.clef,
      tokens: [],
    });
  }

  /** Clones the Rest. */
  clone(): Rest {
    return new Rest({
      config: this.config,
      displayPitch: this.displayPitch,
      durationDenominator: this.durationDenominator,
      dotCount: this.dotCount,
      clef: this.clef,
      tokens: this.tokens,
    });
  }

  /** Renders the Rest. */
  render(opts: { voiceEntryCount: number }): RestRendering {
    const vfStaveNote = new vexflow.StaveNote({
      keys: [this.getKey()],
      duration: `${this.durationDenominator}r`,
      dots: this.dotCount,
      alignCenter: this.shouldCenter(opts.voiceEntryCount),
      clef: this.clef.getType(),
    });

    for (let index = 0; index < this.dotCount; index++) {
      vexflow.Dot.buildAndAttach([vfStaveNote]);
    }

    return { type: 'rest', vexflow: { staveNote: vfStaveNote } };
  }

  private getKey(): string {
    if (this.displayPitch) {
      return this.displayPitch;
    }
    if (this.clef.getType() === 'bass') {
      return 'D/3';
    }
    if (this.durationDenominator === '2') {
      return 'B/4';
    }
    if (this.durationDenominator === '1') {
      return 'D/5';
    }
    return 'B/4';
  }

  private shouldCenter(voiceEntryCount: number): boolean {
    if (voiceEntryCount > 1) {
      return false;
    }
    if (this.durationDenominator === '1') {
      return true;
    }
    if (this.durationDenominator === '2') {
      return true;
    }
    return false;
  }
}
