import * as musicxml from '@/musicxml';

export class StaveLineCount {
  constructor(private partId: string, private staveNumber: number, private lineCount: number) {}

  static default(partId: string, staveNumber: number) {
    return new StaveLineCount(partId, staveNumber, 5);
  }

  getPartId(): string {
    return this.partId;
  }

  getStaveNumber(): number {
    return this.staveNumber;
  }

  getLineCount(): number {
    return this.lineCount;
  }

  isEqual(staveLineCount: StaveLineCount): boolean {
    return (
      this.partId === staveLineCount.partId &&
      this.staveNumber === staveLineCount.staveNumber &&
      this.isEquivalent(staveLineCount)
    );
  }

  isEquivalent(staveLineCount: StaveLineCount): boolean {
    return this.lineCount === staveLineCount.lineCount;
  }

  merge(musicXML: { staveDetail: musicxml.StaveDetails }): StaveLineCount {
    return new StaveLineCount(this.partId, this.staveNumber, musicXML.staveDetail.getStaveLines());
  }
}
