import { Config } from '@/config';
import * as debug from '@/debug';
import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import * as conversions from './conversions';
import { ClefAnnotation, ClefType } from './enums';

const CLEF_PADDING = 5;

/** The result of rendering a clef */
export type ClefRendering = {
  type: 'clef';
  vexflow: {
    clef: vexflow.Clef;
  };
};

/** A musical symbol used to indicate which notes are represented by the lines and spaces on a stave. */
export class Clef {
  private config: Config;
  private log: debug.Logger;
  private sign: musicxml.ClefSign | null;
  private line: number | null;
  private octaveChange: number | null;

  private constructor(opts: {
    config: Config;
    log: debug.Logger;
    sign: musicxml.ClefSign | null;
    line: number | null;
    octaveChange: number | null;
  }) {
    this.config = opts.config;
    this.log = opts.log;
    this.sign = opts.sign;
    this.line = opts.line;
    this.octaveChange = opts.octaveChange;
  }

  /** Creates a clef from a MusicXML element. */
  static fromMusicXML(opts: { config: Config; log: debug.Logger; musicXML: { clef: musicxml.Clef } }): Clef {
    const { config, log, musicXML } = opts;

    const clef = musicXML.clef;

    const sign = clef.getSign();
    const line = clef.getLine();
    const octaveChange = clef.getOctaveChange();

    return new Clef({ config, log, sign, line, octaveChange });
  }

  /** Creates a standard treble clef. */
  static treble(opts: { config: Config; log: debug.Logger }): Clef {
    return new Clef({
      config: opts.config,
      log: opts.log,
      sign: 'G',
      line: 2,
      octaveChange: null,
    });
  }

  /** Returns the width of the clef. */
  @util.memoize()
  getWidth(): number {
    return this.getVfClef().getWidth() + CLEF_PADDING;
  }

  getType(): ClefType {
    return conversions.fromClefPropertiesToClefType(this.sign, this.line);
  }

  /** Returns whether or not the clef is equal with the other. */
  isEqual(other: Clef): boolean {
    return this.sign === other.sign && this.line === other.line && this.octaveChange === other.octaveChange;
  }

  /** Returns the octave change of the clef. Defaults to 0. */
  getOctaveChange(): number {
    return this.octaveChange ?? 0;
  }

  /** Returns the clef annotation. Defaults to null. */
  getAnnotation(): ClefAnnotation | null {
    switch (this.octaveChange) {
      case 1:
        return '8va';
      case -1:
        return '8vb';
      default:
        return null;
    }
  }

  /** Renders the clef. */
  render(): ClefRendering {
    this.log.debug('rendering clef');

    return {
      type: 'clef',
      vexflow: {
        clef: this.getVfClef(),
      },
    };
  }

  private getVfClef(): vexflow.Clef {
    const type = this.getType();
    return new vexflow.Clef(type, 'default', this.getAnnotation() ?? undefined);
  }
}
