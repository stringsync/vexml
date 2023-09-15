import {
  BarlineLocation,
  BARLINE_LOCATIONS,
  BarStyle,
  BAR_STYLES,
  ENDING_TYPES,
  RepeatDirection,
  REPEAT_DIRECTIONS,
  EndingType,
} from './enums';
import { NamedElement } from '@/util';

/**
 * Barline includes information about repeats, endings, and graphical bar styles.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/barline/
 */
export class Barline {
  constructor(private element: NamedElement<'barline'>) {}

  /** Returns the bar style of the barline. Defaults to 'regular'. */
  getBarStyle(): BarStyle {
    return this.element.first('bar-style')?.content().enum(BAR_STYLES) ?? 'regular';
  }

  /** Whether or not the barline is a repeat. Defaults to false. */
  isRepeat(): boolean {
    return this.element.all('repeat').length > 0;
  }

  /** Returns the repeat direction. Defaults to null. */
  getRepeatDirection(): RepeatDirection | null {
    return this.element.first('repeat')?.attr('direction').enum(REPEAT_DIRECTIONS) ?? null;
  }

  /** Returns the location of the barline. Defaults to 'right'. */
  getLocation(): BarlineLocation {
    return this.element
      .attr('location')
      .withDefault('right' as const)
      .enum(BARLINE_LOCATIONS);
  }

  /** Whether or not the barline is an ending */
  isEnding(): boolean {
    return this.element.all('ending').length > 0;
  }

  /** Returns the ending text. Defaults to empty string. */
  getEndingText(): string {
    return this.element.first('ending')?.content().str() ?? '';
  }

  /** Returns the ending number. Defaults to '1'. */
  getEndingNumber(): string {
    return this.element.first('ending')?.attr('number').str() ?? '1';
  }

  /** Returns the ending type. Defaults to 'start'. */
  getEndingType(): EndingType {
    return this.element.first('ending')?.attr('type').enum(ENDING_TYPES) ?? 'start';
  }
}
