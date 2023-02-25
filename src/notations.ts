import { VerticalDirection, VERTICAL_DIRECTIONS } from './enums';
import { NamedElement } from './namedelement';

/**
 * Musical notations that apply to a specific note or chord.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/notations/
 */
export class Notations {
  constructor(private node: NamedElement<'notations'>) {}

  /** Whether or not the note/chord is arpeggiated. */
  isArpeggiated(): boolean {
    return this.node.all('arpeggiate').length > 0;
  }

  /** Returns the direction of the arppegio when appregiated and null otherwise. */
  getArpeggioDirection(): VerticalDirection {
    return this.node.first('arpeggiate')?.attr('direction').enum(VERTICAL_DIRECTIONS) ?? 'up';
  }
}
