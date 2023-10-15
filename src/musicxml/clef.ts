import { ClefSign, CLEF_SIGNS } from './enums';
import { NamedElement } from '@/util';

/**
 * A symbol placed at the left-hand end of the stave, indicating the pitch of the notes written.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/clef-sign/
 */
export class Clef {
  constructor(private element: NamedElement<'clef'>) {}

  /** Returns the stave number this clef belongs to. */
  getStaveNumber(): number {
    return this.element.attr('number').withDefault(1).int();
  }

  /** Returns the clef sign. Defaults to null. */
  getSign(): ClefSign | null {
    return this.element.first('sign')?.content().enum(CLEF_SIGNS) ?? null;
  }

  /** Returns the line of the clef. Defaults to null. */
  getLine(): number | null {
    return this.element.first('line')?.content().int() ?? null;
  }

  /** Returns the octave change of the clef. Defaults to null. */
  getOctaveChange(): number | null {
    return this.element.first('clef-octave-change')?.content().int() ?? null;
  }
}
