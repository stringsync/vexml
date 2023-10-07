import { NamedElement } from '@/util';

/**
 * The <measure-style> element indicates a special way to print partial to multiple measures within a part.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/measure-style/
 */
export class MeasureStyle {
  constructor(private element: NamedElement<'measure-style'>) {}

  /** Returns the stave number this measure style belongs to. */
  getStaveNumber(): number {
    return this.element.attr('number').withDefault(1).int();
  }

  /**
   * Returns how many measures the rest spans.
   *
   * Defaults to 0. A value of 0 indicates that there are no multiple rests.
   */
  getMultipleRestCount(): number {
    return this.element.first('multiple-rest')?.content().int() ?? 0;
  }
}
