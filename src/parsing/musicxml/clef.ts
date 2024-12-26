import * as musicxml from '@/musicxml';
import { ClefSign } from './enums';

export class Clef {
  constructor(
    private partId: string,
    private staveNumber: number,
    private line: number,
    private sign: ClefSign,
    private octaveChange: number | null
  ) {}

  static default(partId: string, staveNumber: number) {
    return new Clef(partId, staveNumber, 2, 'G', null);
  }

  getPartId(): string {
    return this.partId;
  }

  getStaveNumber(): number {
    return this.staveNumber;
  }

  getLine(): number {
    return this.line;
  }

  getSign(): ClefSign {
    return this.sign;
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

  merge(musicXML: { clef: musicxml.Clef }): Clef {
    return new Clef(
      this.partId,
      this.staveNumber,
      musicXML.clef.getLine() ?? this.line,
      musicXML.clef.getSign() ?? this.sign,
      musicXML.clef.getOctaveChange() ?? this.octaveChange
    );
  }
}
