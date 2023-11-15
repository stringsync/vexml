import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as util from '@/util';
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
    return new vexflow.Clef(this.getType()).getWidth() + CLEF_PADDING;
  }

  /** Returns whether or not the clef is equal with the other. */
  isEqual(other: Clef): boolean {
    return this.sign === other.sign && this.line === other.line && this.octaveChange === other.octaveChange;
  }

  /** Returns the type of clef. */
  getType(): ClefType {
    const sign = this.sign;
    const line = this.line;

    if (sign === 'G') {
      // with G line defaults to 2
      // see https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/line/
      if (line === 1) return 'french';
      return 'treble';
    }

    if (sign === 'F') {
      if (line === 5) return 'subbass';
      if (line === 3) return 'baritone-f';
      return 'bass';
    }

    if (sign === 'C') {
      if (line === 5) return 'baritone-c';
      if (line === 4) return 'tenor';
      if (line === 2) return 'mezzo-soprano';
      if (line === 1) return 'soprano';
      return 'alto';
    }

    if (sign === 'percussion') {
      return 'percussion';
    }

    if (sign === 'TAB') {
      return 'tab';
    }

    return 'treble';
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
    const vfClef = new vexflow.Clef(this.getType());

    return {
      type: 'clef',
      vexflow: {
        clef: vfClef,
      },
    };
  }
}
