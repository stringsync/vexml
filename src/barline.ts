import { NamedNode } from './namednode';
import { BarStyle } from './types';

/**
 * Barline includes information about repeats, endings, and graphical bar styles.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/barline/
 */
export class Barline {
  constructor(private node: NamedNode<'barline'>) {}

  /** Returns the bar style of the barline. Defaults to 'regular'. */
  getBarStyle(): BarStyle {
    const barStyle = this.node.asElement().getElementsByTagName('bar-style').item(0)?.textContent;
    return this.isBarStyle(barStyle) ? barStyle : 'regular';
  }

  private isBarStyle(value: any): value is BarStyle {
    return [
      'dashed',
      'dotted',
      'heavy',
      'heavy-heavy',
      'heavy-light',
      'light-heavy',
      'light-light',
      'none',
      'regular',
      'short',
      'tick',
    ].includes(value);
  }
}
