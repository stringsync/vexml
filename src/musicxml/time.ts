import { NamedElement } from '../util/namedelement';
import { TimeSignature } from './timesignature';

/**
 * Time represents a time signature element.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/time/
 */
export class Time {
  constructor(private element: NamedElement<'time'>) {}

  /** Returns the staff number this time belongs to. */
  getStaffNumber(): number {
    return this.element.attr('number').withDefault(1).int();
  }

  /** Returns the time signatures of the time. There is typically only one. */
  getTimeSignatures(): TimeSignature[] {
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
      const beatsPerMeasure = parseInt(beats[index], 10);
      const beatValue = parseInt(beatTypes[index], 10);
      result.push(new TimeSignature(beatsPerMeasure, beatValue));
    }

    return result;
  }
}
