import { Key } from './key';
import * as xml from './xml';

describe(Key, () => {
  describe('getFifthsCount', () => {
    it('returns the fifths count of the key', () => {
      const node = xml.key({ fifths: xml.fifths({ textContent: '5' }) });
      const key = new Key(node);
      expect(key.getFifthsCount()).toBe(5);
    });

    it('defaults to 0 when missing fifths', () => {
      const node = xml.key();
      const key = new Key(node);
      expect(key.getFifthsCount()).toBe(0);
    });
  });
});
