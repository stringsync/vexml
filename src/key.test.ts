import { Key } from './key';
import * as xml from './xml';

describe(Key, () => {
  describe('getFifthsCount', () => {
    it('returns the fifths count of the key', () => {
      const node = xml.key({ fifths: xml.fifths({ value: '5' }) });
      const key = new Key(node);
      expect(key.getFifthsCount()).toBe(5);
    });

    it('defaults to 0 when missing fifths', () => {
      const node = xml.key();
      const key = new Key(node);
      expect(key.getFifthsCount()).toBe(0);
    });
  });

  describe('getKeySignature', () => {
    it.each([
      { fifths: 0, keySignature: 'C' },
      { fifths: 1, keySignature: 'G' },
      { fifths: 2, keySignature: 'D' },
      { fifths: 3, keySignature: 'A' },
      { fifths: 4, keySignature: 'E' },
      { fifths: 5, keySignature: 'B' },
      { fifths: 6, keySignature: 'F#' },
      { fifths: 7, keySignature: 'C#' },
      { fifths: -1, keySignature: 'F' },
      { fifths: -2, keySignature: 'Bb' },
      { fifths: -3, keySignature: 'Eb' },
      { fifths: -4, keySignature: 'Ab' },
      { fifths: -5, keySignature: 'Cb' },
      { fifths: -6, keySignature: 'Gb' },
      { fifths: -7, keySignature: 'Cb' },
    ])('returns the key signature based on the fifths: $fifths yields $keySignature', (t) => {
      const node = xml.key({ fifths: xml.fifths({ value: t.fifths.toString() }) });
      const key = new Key(node);
      expect(key.getKeySignature()).toBe(t.keySignature);
    });

    it('returns C when missing fifths', () => {
      const node = xml.key();
      const key = new Key(node);
      expect(key.getKeySignature()).toBe('C');
    });

    it('returns C when fifths is invalid', () => {
      const node = xml.key({ fifths: xml.fifths({ value: 'hello' }) });
      const key = new Key(node);
      expect(key.getKeySignature()).toBe('C');
    });
  });
});
