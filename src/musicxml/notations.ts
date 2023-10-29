import { VerticalDirection, VERTICAL_DIRECTIONS } from './enums';
import { NamedElement } from '@/util';
import { Tuplet } from './tuplet';

/**
 * Musical notations that apply to a specific note or chord.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/notations/
 */
export class Notations {
  constructor(private element: NamedElement<'notations'>) {}

  /** Whether or not the note/chord is arpeggiated. */
  isArpeggiated(): boolean {
    return this.element.all('arpeggiate').length > 0;
  }

  /** Returns the direction of the arppegio when appregiated and null otherwise. */
  getArpeggioDirection(): VerticalDirection {
    return this.element.first('arpeggiate')?.attr('direction').enum(VERTICAL_DIRECTIONS) ?? 'up';
  }

  /** Whether the notations has at least one tuplet. */
  hasTuplets(): boolean {
    return this.element.all('tuplet').length > 0;
  }

  /** Returns the tuplets of the notations. Defaults to an empty array. */
  getTuplets(): Tuplet[] {
    return this.element.all('tuplet').map((element) => new Tuplet(element));
  }
}
