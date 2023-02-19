import { Attributes } from './attributes';
import { Barline } from './barline';
import { NamedNode } from './namednode';
import { Note } from './note';
import * as parse from './parse';

/**
 * Measure is a basic musical data container that has notes and rests.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/measure-partwise/
 */
export class Measure {
  constructor(private node: NamedNode<'measure'>) {}

  /** Returns the measure number or an empty string if missing. */
  getNumber(): string {
    return this.node.asElement().getAttribute('number') ?? '';
  }

  /** Returns whether or not the measure has a specified width */
  hasWidth(): boolean {
    return this.node.asElement().hasAttribute('width');
  }

  /** Returns the specified measured width in tenths or -1 if there was a problem parsing it. */
  getWidth(): number {
    const width = this.node.asElement().getAttribute('width');
    return parse.intOrDefault(width, -1);
  }

  /** Returns the <attributes> element of the measure. */
  getAttributes(): Attributes[] {
    return Array.from(this.node.asElement().getElementsByTagName('attributes'))
      .map((attributes) => NamedNode.of<'attributes'>(attributes))
      .map((node) => new Attributes(node));
  }

  /** Returns the notes of the measure. */
  getNotes(): Note[] {
    return Array.from(this.node.asElement().getElementsByTagName('note'))
      .map((note) => NamedNode.of<'note'>(note))
      .map((node) => new Note(node));
  }

  /** Returns the barlines of the measure. */
  getBarlines(): Barline[] {
    return Array.from(this.node.asElement().getElementsByTagName('barline'))
      .map((barline) => NamedNode.of<'barline'>(barline))
      .map((node) => new Barline(node));
  }
}
