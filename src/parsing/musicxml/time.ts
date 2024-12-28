import * as musicxml from '@/musicxml';
import { Fraction } from '@/util';

/** Represents a musical time signature. */
export class Time {
  constructor(private partId: string, private staveNumber: number, private components: Fraction[]) {}

  static default(partId: string, staveNumber: number) {
    return new Time(partId, staveNumber, []);
  }

  static fromMusicXML(partId: string, musicXML: { time: musicxml.Time }) {
    // TODO: Extract the real time components.
    return new Time(partId, musicXML.time.getStaveNumber(), [new Fraction(4, 4)]);
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

  isEqual(timeSignature: Time): boolean {
    return (
      this.partId === timeSignature.partId &&
      this.staveNumber === timeSignature.staveNumber &&
      this.isEquivalent(timeSignature)
    );
  }

  isEquivalent(timeSignature: Time): boolean {
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
}
