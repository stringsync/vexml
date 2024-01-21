import { NamedElement } from '@/util';
import { ACCIDENTAL_TYPES, AccidentalType } from './enums';

/**
 * An `<accidental-mark>` element can be used as a separate notation or as part of an ornament. When used in an
 * ornament, position and placement are relative to the ornament, not relative to the note.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/accidental-mark/
 */
export class AccidentalMark {
  constructor(private element: NamedElement<'accidental-mark'>) {}

  /** Returns the type of the accidental mark. Defaults to null. */
  getType(): AccidentalType | null {
    return this.element.content().enum(ACCIDENTAL_TYPES);
  }
}
