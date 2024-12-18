import { NamedElement } from '@/util';

const DEFAULT_MILLIMETERS = 7;
const DEFAULT_TENTHS = 40;
const DEFAULT_MILLIMETERS_PER_TENTH = DEFAULT_MILLIMETERS / DEFAULT_TENTHS;

/**
 * Describes the scaling throughout the MusicXML document.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/scaling/
 */
export class Scaling {
  constructor(private element: NamedElement<'scaling'>) {}

  /** Returns the factor to adjust specified measurements by. */
  getScalingFactor(): number {
    const millimeters = this.getMillimeters();
    const tenths = this.getTenths();
    const millimetersPerTenth = millimeters / tenths;
    return millimetersPerTenth / DEFAULT_MILLIMETERS_PER_TENTH;
  }

  /** Returns the millimeters. */
  getMillimeters(): number {
    return this.element.first('millimeters')?.content().withDefault(DEFAULT_MILLIMETERS).float() ?? DEFAULT_MILLIMETERS;
  }

  /** Returns the tenths. */
  getTenths(): number {
    return this.element.first('tenths')?.content().withDefault(DEFAULT_TENTHS).float() ?? DEFAULT_TENTHS;
  }
}
