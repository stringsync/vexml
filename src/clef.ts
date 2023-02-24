import { NamedElement } from './namedelement';
import { ClefAnnotation, ClefSign, ClefType } from './types';
import * as parse from './parse';

/**
 * A symbol placed at the left-hand end of  staff, indicating the pitch of the notes written.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/clef-sign/
 */
export class Clef {
  constructor(private node: NamedElement<'clef'>) {}

  /** Returns the staff */
  getStaffNumber(): number {
    const number = this.node.native().getAttribute('number');
    return parse.intOrDefault(number, 1);
  }

  /** Returns the clef sign. Defaults to null. */
  getSign(): ClefSign | null {
    const clefSign = this.node.native().getElementsByTagName('sign').item(0)?.textContent;
    return this.isClefSign(clefSign) ? clefSign : null;
  }

  /** Returns the line of the clef. Defaults to null. */
  getLine(): number | null {
    const line = this.node.native().getElementsByTagName('line').item(0)?.textContent;
    return parse.intOrDefault(line, null);
  }

  /** Returns the octave change of the clef. Defaults to null. */
  getOctaveChange(): number | null {
    const octaveChange = this.node.native().getElementsByTagName('clef-octave-change').item(0)?.textContent;
    return parse.intOrDefault(octaveChange, null);
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

  private isClefSign(value: any): value is ClefSign {
    return ['G', 'F', 'C', 'percussion', 'TAB', 'jianpu', 'none'].includes(value);
  }
}
