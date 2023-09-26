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
}
