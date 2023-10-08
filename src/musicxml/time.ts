import { NamedElement, Fraction } from '@/util';
import { TimeSignature } from './timesignature';
import { TIME_SYMBOLS } from './enums';

/**
 * Time represents a time signature element.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/time/
 */
export class Time {
  constructor(private element: NamedElement<'time'>) {}

  /** Returns the stave number this time belongs to. */
  getStaveNumber(): number {
    return this.element.attr('number').withDefault(1).int();
  }

  /** Returns the time signatures of the time. There is typically only one. */
  getTimeSignatures(): TimeSignature[] {
    // The symbol overrides any other time specifications. This is done to avoid incompatible symbol and time signature
    // specifications.
    const symbol = this.element.attr('symbol').enum(TIME_SYMBOLS);
    switch (symbol) {
      case 'common':
        return [TimeSignature.common()];
      case 'cut':
        return [TimeSignature.cut()];
    }

    const result = new Array<TimeSignature>();

    const beats = this.element
      .all('beats')
      .map((beats) => beats.content().str())
      .filter((content): content is string => typeof content === 'string');
    const beatTypes = this.element
      .all('beat-type')
      .map((beatType) => beatType.content().str())
      .filter((content): content is string => typeof content === 'string');

    // Ignore extra <beats> and <beat-type> elements.
    const len = Math.min(beats.length, beatTypes.length);
    for (let index = 0; index < len; index++) {
      const beatsPerMeasure = beats[index];
      const beatValue = beatTypes[index];
      const timeSignature = this.parseTimeSignature(beatsPerMeasure, beatValue);
      result.push(timeSignature);
    }

    return result;
  }

  private parseTimeSignature(beatsPerMeasure: string, beatValue: string): TimeSignature {
    const denominator = parseInt(beatValue.trim(), 10);
    const numerators = beatsPerMeasure.split('+').map((b) => parseInt(b.trim(), 10));

    if (numerators.length > 1) {
      const fractions = numerators.map((numerator) => new Fraction(numerator, denominator));
      return TimeSignature.complex(fractions);
    }

    return TimeSignature.of(numerators[0], denominator);
  }
}
