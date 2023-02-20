import { NamedNode } from './namednode';
import { ClefSign } from './types';
import * as parse from './parse';

/**
 * A symbol placed at the left-hand end of  staff, indicating the pitch of the notes written.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/clef-sign/
 */
export class Clef {
  constructor(private node: NamedNode<'clef'>) {}

  /** Returns the clef sign. Defaults to 'G'. */
  getSign(): ClefSign {
    const clefSign = this.node.asElement().getElementsByTagName('sign').item(0)?.textContent;
    return this.isClefSign(clefSign) ? clefSign : 'G';
  }

  /** Returns the line of the clef. Defaults to null. */
  getLine(): number | null {
    const line = this.node.asElement().getElementsByTagName('line').item(0)?.textContent;
    return parse.intOrDefault(line, null);
  }

  /** Returns the octave change of the clef. Defaults to null. */
  getOctaveChange(): number | null {
    const octaveChange = this.node.asElement().getElementsByTagName('clef-octave-change').item(0)?.textContent;
    return parse.intOrDefault(octaveChange, null);
  }

  private isClefSign(value: any): value is ClefSign {
    return ['G', 'F', 'C'].includes(value);
  }
}
