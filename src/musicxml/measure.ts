import { Attributes } from './attributes';
import { Barline } from './barline';
import { NamedElement } from '../util/namedelement';
import { Note } from './note';
import { Print } from './print';

/**
 * Measure is a basic musical data container that has notes and rests.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/measure-partwise/
 */
export class Measure {
  constructor(private element: NamedElement<'measure'>) {}

  /** Returns the measure number or an empty string if missing. */
  getNumber(): string {
    return this.element.attr('number').withDefault('').str();
  }

  /** Returns whether or not the measure has a specified width */
  hasWidth(): boolean {
    return typeof this.getWidth() === 'number';
  }

  /** Returns the specified measured width in tenths. Defaults to null. */
  getWidth(): number | null {
    return this.element.attr('width').int();
  }

  /** Returns the <attributes> element of the measure. */
  getAttributes(): Attributes[] {
    return this.element.all('attributes').map((element) => new Attributes(element));
  }

  /** Returns the notes of the measure. */
  getNotes(): Note[] {
    return this.element.all('note').map((element) => new Note(element));
  }

  /** Returns the barlines of the measure. */
  getBarlines(): Barline[] {
    return this.element.all('barline').map((element) => new Barline(element));
  }

  /** Returns the prints of the measure. */
  getPrints(): Print[] {
    return this.element.all('print').map((element) => new Print(element));
  }
}
