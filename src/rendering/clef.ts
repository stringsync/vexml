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
  private sign: musicxml.ClefSign | null;
  private line: number | null;
  private octaveChange: number | null;

  private constructor(sign: musicxml.ClefSign | null, line: number | null, octaveChange: number | null) {
    this.sign = sign;
    this.line = line;
    this.octaveChange = octaveChange;
  }

  /** Creates a clef from a MusicXML element. */
  static from(musicXml: { clef: musicxml.Clef }): Clef {
    const clef = musicXml.clef;

    const sign = clef.getSign();
    const line = clef.getLine();
    const octaveChange = clef.getOctaveChange();

    return new Clef(sign, line, octaveChange);
  }

  /** Creates a standard treble clef. */
  static treble(): Clef {
    return new Clef('G', 2, null);
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
