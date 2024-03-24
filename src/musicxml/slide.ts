import { NamedElement } from '@/util';
import { START_STOP, StartStop } from './enums';

/**
 * A `<slide>` is continuous between the two pitches and defaults to a solid line.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/slide/
 */
export class Slide {
  constructor(private element: NamedElement<'slide'>) {}

  /** The slide type. Defaults to null. */
  getType(): StartStop | null {
    return this.element.attr('type').enum(START_STOP) ?? null;
  }
}
