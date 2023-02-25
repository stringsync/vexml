import { NamedElement } from './namedelement';
import { TimeSignature } from './types';

/**
 * Time represents a time signature element.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/time/
 */
export class Time {
  constructor(private node: NamedElement<'time'>) {}

  /** Returns the time signatures of the time. There is typically only one. */
  getTimeSignatures(): TimeSignature[] {
    const result = new Array<TimeSignature>();

    const beats = this.node
      .all('beats')
      .map((beats) => beats.content().str())
      .filter((content): content is string => typeof content === 'string');
    const beatTypes = this.node
      .all('beat-type')
      .map((beatType) => beatType.content().str())
      .filter((content): content is string => typeof content === 'string');

    // Ignore extra <beats> and <beat-type> elements.
    const len = Math.min(beats.length, beatTypes.length);
    for (let ndx = 0; ndx < len; ndx++) {
      result.push({
        numerator: beats[ndx],
        denominator: beatTypes[ndx],
      });
    }

    return result;
  }
}
