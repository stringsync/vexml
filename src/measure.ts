import { Attributes } from './attributes';
import { Barline } from './barline';
import { NamedElement } from './namedelement';
import { Note } from './note';
import { Print } from './print';

/**
 * Measure is a basic musical data container that has notes and rests.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/measure-partwise/
 */
export class Measure {
  constructor(private node: NamedElement<'measure'>) {}

  /** Returns the measure number or an empty string if missing. */
  getNumber(): string {
    return this.node.native().getAttribute('number') ?? '';
  }

  /** Returns whether or not the measure has a specified width */
  hasWidth(): boolean {
    return this.node.native().hasAttribute('width');
  }

  /** Returns the specified measured width in tenths. Defaults to null. */
  getWidth(): number | null {
    return this.node.attr('width').int();
  }

  /** Returns the <attributes> element of the measure. */
  getAttributes(): Attributes[] {
    return Array.from(this.node.native().getElementsByTagName('attributes'))
      .map((attributes) => NamedElement.of<'attributes'>(attributes))
      .map((node) => new Attributes(node));
  }

  /** Returns the notes of the measure. */
  getNotes(): Note[] {
    return Array.from(this.node.native().getElementsByTagName('note'))
      .map((note) => NamedElement.of<'note'>(note))
      .map((node) => new Note(node));
  }

  /** Returns the barlines of the measure. */
  getBarlines(): Barline[] {
    return Array.from(this.node.native().getElementsByTagName('barline'))
      .map((barline) => NamedElement.of<'barline'>(barline))
      .map((node) => new Barline(node));
  }

  /** Returns the prints of the measure. */
  getPrints(): Print[] {
    return Array.from(this.node.native().getElementsByTagName('print'))
      .map((print) => NamedElement.of<'print'>(print))
      .map((node) => new Print(node));
  }
}
