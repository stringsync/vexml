import { Clef } from './clef';
import { Key } from './key';
import { NamedElement } from '@/util';
import { Time } from './time';
import { StaveDetails } from './stavedetails';
import { MeasureStyle } from './measurestyle';

/**
 * Attributes contains musical information that typically changes each measure, such as key and time signatures, clefs,
 * transpositions and staving.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/attributes/
 */
export class Attributes {
  constructor(private element: NamedElement<'attributes'>) {}

  /** Returns the number of staves. */
  getStaveCount(): number | null {
    return this.element.first('staves')?.content().int() ?? null;
  }

  /** Returns the stave details. */
  getStaveDetails(): StaveDetails[] {
    return this.element.all('staff-details').map((element) => new StaveDetails(element));
  }

  /** Returns the times. */
  getTimes(): Time[] {
    return this.element.all('time').map((element) => new Time(element));
  }

  /** Returns the keys. */
  getKeys(): Key[] {
    return this.element.all('key').map((element) => new Key(element));
  }

  /** Returns the clefs. */
  getClefs(): Clef[] {
    return this.element.all('clef').map((element) => new Clef(element));
  }

  /** Returns the measure styles. */
  getMeasureStyles(): MeasureStyle[] {
    return this.element.all('measure-style').map((element) => new MeasureStyle(element));
  }

  /** Returns the how many divisions per quarter note are used to indicate a note's duration. */
  getQuarterNoteDivisions(): number | null {
    return this.element.first('divisions')?.content().int() ?? null;
  }
}
