import { NamedNode } from './namednode';
import { TimeSignature } from './types';

/**
 * Time represents a time signature element.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/time/
 */
export class Time {
  constructor(private node: NamedNode<'time'>) {}

  /** Returns the time signatures of the time. There is typically only one. */
  getTimeSignatures(): TimeSignature[] {
    const result = new Array<TimeSignature>();

    const beats = Array.from(this.node.asElement().getElementsByTagName('beats'))
      .map((beats) => beats.textContent)
      .filter((text): text is string => typeof text === 'string');
    const beatTypes = Array.from(this.node.asElement().getElementsByTagName('beat-type'))
      .map((beatType) => beatType.textContent)
      .filter((text): text is string => typeof text === 'string');

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
