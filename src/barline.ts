import { NamedNode } from './namednode';
import { BarlineLocation, BarStyle, EndingType, RepeatDirection } from './types';

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

  /** Whether or not the barline is a repeat. Defaults to false. */
  isRepeat(): boolean {
    return this.node.asElement().getElementsByTagName('repeat').length > 0;
  }

  /** Returns the repeat direction. Defaults to null. */
  getRepeatDirection(): RepeatDirection | null {
    const repeatDirection = this.node.asElement().getElementsByTagName('repeat').item(0)?.getAttribute('direction');
    return this.isRepeatDirection(repeatDirection) ? repeatDirection : null;
  }

  /** Returns the location of the barline. Defaults to 'right'. */
  getLocation(): BarlineLocation {
    const location = this.node.asElement().getAttribute('location');
    return this.isBarlineLocation(location) ? location : 'right';
  }

  /** Whether or not the barline is an ending */
  isEnding(): boolean {
    return this.node.asElement().getElementsByTagName('ending').length > 0;
  }

  /** Returns the ending text. Defaults to empty string. */
  getEndingText(): string {
    return this.node.asElement().getElementsByTagName('ending').item(0)?.textContent ?? '';
  }

  /** Returns the ending number. Defaults to '1'. */
  getEndingNumber(): string {
    return this.node.asElement().getElementsByTagName('ending').item(0)?.getAttribute('number') ?? '1';
  }

  /** Returns the ending type. Defaults to 'start'. */
  getEndingType(): EndingType {
    const endingType = this.node.asElement().getElementsByTagName('ending').item(0)?.getAttribute('type');
    return this.isEndingType(endingType) ? endingType : 'start';
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

  private isRepeatDirection(value: any): value is RepeatDirection {
    return ['backward', 'forward'].includes(value);
  }

  private isBarlineLocation(value: any): value is BarlineLocation {
    return ['right', 'left', 'middle'].includes(value);
  }

  private isEndingType(value: any): value is EndingType {
    return ['start', 'stop', 'discontinue'].includes(value);
  }
}
