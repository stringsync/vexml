import { ClefAnnotation, ClefSign, ClefType, CLEF_SIGNS } from './enums';
import { NamedElement } from '../util/namedelement';

/**
 * A symbol placed at the left-hand end of  staff, indicating the pitch of the notes written.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/clef-sign/
 */
export class Clef {
  constructor(private element: NamedElement<'clef'>) {}

  /** Returns the staff */
  getStaffNumber(): number {
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

  /** Returns the clef type. Defaults to null. */
  getClefType(): ClefType | null {
    const sign = this.getSign();
    const line = this.getLine();

    if (sign === 'G') {
      // with G line defaults to 2
      // see https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/line/
      if (line === 1) return 'french';
      return 'treble';
    }

    if (sign === 'F') {
      if (line === 5) return 'subbass';
      if (line === 3) return 'baritone-f';
      return 'bass';
    }

    if (sign === 'C') {
      if (line === 5) return 'baritone-c';
      if (line === 4) return 'tenor';
      if (line === 2) return 'mezzo-soprano';
      if (line === 1) return 'soprano';
      return 'alto';
    }

    if (sign === 'percussion') {
      return 'percussion';
    }

    if (sign === 'TAB') {
      return 'treble';
    }

    return null;
  }

  /** Returns the clef annotation. Defaults to null. */
  getAnnotation(): ClefAnnotation | null {
    switch (this.getOctaveChange()) {
      case 1:
        return '8va';
      case -1:
        return '8vb';
      default:
        return null;
    }
  }
}
