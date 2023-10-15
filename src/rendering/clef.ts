import * as musicxml from '@/musicxml';

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

  static fromMusicXml(musicXml: { clef: musicxml.Clef }) {
    const clef = musicXml.clef;

    const sign = clef.getSign();
    const line = clef.getLine();
    const octaveChange = clef.getOctaveChange();

    return new Clef(sign, line, octaveChange);
  }
}
