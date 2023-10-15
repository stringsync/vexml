import { Key } from '@/musicxml/key';
import { xml } from '@/util';
import { KEY_MODES } from '@/musicxml/enums';

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

  describe('getMode', () => {
    it.each(KEY_MODES.values)(`returns the mode of the key: '%s'`, (keyMode) => {
      const node = xml.key({ mode: xml.mode({ value: keyMode }) });
      const key = new Key(node);
      expect(key.getMode()).toBe(keyMode);
    });

    it(`defaults to 'none' when missing`, () => {
      const node = xml.key();
      const key = new Key(node);
      expect(key.getMode()).toBe('none');
    });

    it(`defaults to 'none' when invalid`, () => {
      const node = xml.key({ mode: xml.mode({ value: 'foo' }) });
      const key = new Key(node);
      expect(key.getMode()).toBe('none');
    });
  });
});
