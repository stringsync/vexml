import { NamedElement } from '../util';
import { SyllabicType } from './enums';

export type LyricComponent =
  | { type: 'syllabic'; value: SyllabicType }
  | { type: 'text'; value: string }
  | { type: 'elision'; value: string }
  | { type: 'extend' };

/**
 * The <lyric> element represents text underlays for lyrics.
 *
 * https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/lyric/
 */
export class Lyric {
  constructor(private element: NamedElement<'lyric'>) {}

  /** Returns the verse number the lyric belongs to. Defaults to 1. */
  getVerseNumber(): string {
    return this.element.attr('number').withDefault('1').str();
  }
}
