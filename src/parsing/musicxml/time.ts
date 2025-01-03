import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { Fraction } from './fraction';

/** Represents a musical time signature. */
export class Time {
  constructor(private partId: string, private staveNumber: number, private components: util.Fraction[]) {}

  static default(partId: string, staveNumber: number) {
    return new Time(partId, staveNumber, []);
  }

  static fromMusicXML(partId: string, musicXML: { time: musicxml.Time }) {
    // TODO: Extract the real time components.
    return new Time(partId, musicXML.time.getStaveNumber(), [new util.Fraction(4, 4)]);
  }

  parse(): data.Time {
    return {
      type: 'time',
      components: this.getComponents().map((component) => component.parse()),
    };
  }

  getPartId(): string {
    return this.partId;
  }

  getStaveNumber(): number {
    return this.staveNumber;
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

  private getComponents(): Fraction[] {
    return this.components.map((component) => new Fraction(component));
  }
}
