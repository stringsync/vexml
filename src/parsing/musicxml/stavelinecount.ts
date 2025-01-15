import * as musicxml from '@/musicxml';
import { Config } from '@/config';
import { Logger } from '@/debug';

export class StaveLineCount {
  constructor(
    private config: Config,
    private log: Logger,
    private partId: string,
    private staveNumber: number,
    private value: number
  ) {}

  static default(config: Config, log: Logger, partId: string, staveNumber: number) {
    return new StaveLineCount(config, log, partId, staveNumber, 5);
  }

  static create(config: Config, log: Logger, partId: string, musicXML: { staveDetails: musicxml.StaveDetails }) {
    return new StaveLineCount(
      config,
      log,
      partId,
      musicXML.staveDetails.getStaveNumber(),
      musicXML.staveDetails.getStaveLines()
    );
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
