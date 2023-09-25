import { NamedElement } from '../util';

/**
 * The <lyric> element represents text underlays for lyrics.
 *
 * https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/lyric/
 */
export class Lyric {
  constructor(private element: NamedElement<'lyric'>) {}
}
