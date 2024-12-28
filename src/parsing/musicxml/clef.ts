import * as musicxml from '@/musicxml';
import { ClefSign } from './enums';

export class Clef {
  constructor(
    private partId: string,
    private staveNumber: number,
    private line: number | null,
    private sign: ClefSign | null,
    private octaveChange: number | null
  ) {}

  static default(partId: string, staveNumber: number) {
    return new Clef(partId, staveNumber, null, null, null);
  }

  static fromMusicXML(partId: string, musicXML: { clef: musicxml.Clef }) {
    return new Clef(
      partId,
      musicXML.clef.getStaveNumber(),
      musicXML.clef.getLine(),
      musicXML.clef.getSign(),
      musicXML.clef.getOctaveChange()
    );
  }

  getPartId(): string {
    return this.partId;
  }

  getStaveNumber(): number {
    return this.staveNumber;
  }
  getSign(): ClefSign | null {
    return this.sign;
  }

  getLine(): number | null {
    return this.line;
  }

  getOctaveChange(): number | null {
    return this.octaveChange;
  }

  isEqual(clef: Clef): boolean {
    return this.partId === clef.partId && this.staveNumber === clef.staveNumber && this.isEquivalent(clef);
  }

  isEquivalent(clef: Clef): boolean {
    return this.line === clef.line && this.sign === clef.sign && this.octaveChange === clef.octaveChange;
  }
}
