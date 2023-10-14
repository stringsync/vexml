import * as musicxml from '@/musicxml';

/** Represents a key signature. */
export class KeySignature {
  static fromKey(key: musicxml.Key): KeySignature {
    return new KeySignature();
  }
}
