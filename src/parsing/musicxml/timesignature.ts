import * as musicxml from '@/musicxml';
import { Fraction } from '@/util';

export class TimeSignature {
  constructor(private partId: string, private staveNumber: number, private components: Fraction[]) {}

  static default(partId: string, staveNumber: number) {
    return new TimeSignature(partId, staveNumber, []);
  }

  getPartId(): string {
    return this.partId;
  }

  getStaveNumber(): number {
    return this.staveNumber;
  }

  getComponents(): Fraction[] {
    return this.components;
  }

  isEqual(timeSignature: TimeSignature): boolean {
    return (
      this.partId === timeSignature.partId &&
      this.staveNumber === timeSignature.staveNumber &&
      this.isEquivalent(timeSignature)
    );
  }

  isEquivalent(timeSignature: TimeSignature): boolean {
    if (this.components.length !== timeSignature.components.length) {
      return false;
    }

    for (let i = 0; i < this.components.length; i++) {
      // We use isEqual instead of isEquivalent because they would be _displayed_ differently.
      if (!this.components[i].isEqual(timeSignature.components[i])) {
        return false;
      }
    }

    return true;
  }

  merge(musicXML: { time: musicxml.Time }): TimeSignature {
    // TODO: Extract components from the time.
    return new TimeSignature(this.partId, this.staveNumber, this.components);
  }
}
