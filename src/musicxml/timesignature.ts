import { TimeSymbol } from './enums';

export class TimeSignature {
  private constructor(private beatsPerMeasure: number, private beatValue: number, private symbol: TimeSymbol | null) {}

  /** Returns a normal TimeSignature, composed of two numbers. */
  static of(beatsPerMeasure: number, beatValue: number): TimeSignature {
    return new TimeSignature(beatsPerMeasure, beatValue, null);
  }

  /** Returns a TimeSignature in cut time. */
  static cut(): TimeSignature {
    return new TimeSignature(2, 2, 'cut');
  }

  /** Returns a TimeSignature in common time. */
  static common(): TimeSignature {
    return new TimeSignature(4, 4, 'common');
  }

  /** Clones the TimeSignature. */
  clone(): TimeSignature {
    return new TimeSignature(this.beatsPerMeasure, this.beatValue, this.symbol);
  }

  /** Returns the symbol of the time signature. */
  getSymbol(): TimeSymbol | null {
    return this.symbol;
  }

  /** Returns the number of beats per measure. */
  getBeatsPerMeasure(): number {
    return this.beatsPerMeasure;
  }

  /** Returns the value of each beat. */
  getBeatValue(): number {
    return this.beatValue;
  }
}
