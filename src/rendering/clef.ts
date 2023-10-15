import * as musicxml from '@/musicxml';
import { ClefAnnotation, ClefType } from './enums';

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
  static fromMusicXml(musicXml: { clef: musicxml.Clef }): Clef {
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
}
