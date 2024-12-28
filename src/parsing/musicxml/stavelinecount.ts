import * as musicxml from '@/musicxml';

export class StaveLineCount {
  constructor(private partId: string, private staveNumber: number, private value: number) {}

  static default(partId: string, staveNumber: number) {
    return new StaveLineCount(partId, staveNumber, 5);
  }

  static fromMusicXML(partId: string, musicXML: { staveDetails: musicxml.StaveDetails }) {
    return new StaveLineCount(partId, musicXML.staveDetails.getStaveNumber(), musicXML.staveDetails.getStaveLines());
  }

  getPartId(): string {
    return this.partId;
  }

  getStaveNumber(): number {
    return this.staveNumber;
  }

  getValue(): number {
    return this.value;
  }

  isEqual(staveLineCount: StaveLineCount): boolean {
    return (
      this.partId === staveLineCount.partId &&
      this.staveNumber === staveLineCount.staveNumber &&
      this.isEquivalent(staveLineCount)
    );
  }

  isEquivalent(staveLineCount: StaveLineCount): boolean {
    return this.value === staveLineCount.value;
  }
}
