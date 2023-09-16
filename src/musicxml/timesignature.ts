export class TimeSignature {
  constructor(private beatsPerMeasure: number, private beatValue: number) {}

  clone(): TimeSignature {
    return new TimeSignature(this.beatsPerMeasure, this.beatValue);
  }

  /**
   * Returns the number of beats per measure.
   */
  getBeatsPerMeasure(): number {
    return this.beatsPerMeasure;
  }

  /**
   * Returns the value of each beat.
   */
  getBeatValue(): number {
    return this.beatValue;
  }

  /**
   * Returns a string representation of the time signature.
   */
  toString(): string {
    return `${this.beatsPerMeasure}/${this.beatValue}`;
  }
}
