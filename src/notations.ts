import { NamedNode } from './namednode';
import { VerticalDirection } from './types';

/**
 * Musical notations that apply to a specific note or chord.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/notations/
 */
export class Notations {
  constructor(private node: NamedNode<'notations'>) {}

  /** Whether or not the note/chord is arpeggiated. */
  isArpeggiated(): boolean {
    return this.node.asElement().getElementsByTagName('arpeggiate').length > 0;
  }

  /** Returns the direction of the arppegio when appregiated and null otherwise. */
  getArpeggioDirection(): VerticalDirection {
    const direction = this.node.asElement().getElementsByTagName('arpeggiate').item(0)?.getAttribute('direction');
    return this.isVerticalDirection(direction) ? direction : 'up';
  }

  private isVerticalDirection(value: any): value is VerticalDirection {
    return ['up', 'down'].includes(value);
  }
}
