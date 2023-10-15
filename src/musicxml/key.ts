import { NamedElement } from '@/util';
import { KEY_MODES, KeyMode } from './enums';

/**
 * Key represents a key signature.
 *
 * See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/key/
 */
export class Key {
  constructor(private element: NamedElement<'key'>) {}

  /** Returns the fifths count of the key. Defaults to 0. */
  getFifthsCount(): number {
    return this.element.first('fifths')?.content().int() ?? 0;
  }

  /** Returns the mode of the key. Defaults to 'none'. */
  getMode(): KeyMode {
    return this.element.first('mode')?.content().enum(KEY_MODES) ?? 'none';
  }

  /** Returns the stave number this key belongs to. */
  getStaveNumber(): number {
    return this.element.attr('number').withDefault(1).int();
  }
}
