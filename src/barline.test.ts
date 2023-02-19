import { Barline } from './barline';
import * as xml from './xml';

describe(Barline, () => {
  describe('getBarStyle', () => {
    it.each([
      'dashed',
      'dotted',
      'heavy',
      'heavy-heavy',
      'heavy-light',
      'light-heavy',
      'light-light',
      'none',
      'regular',
      'short',
      'tick',
    ])(`returns the bar style of the barline: '%s'`, (barStyle) => {
      const node = xml.barline({ barStyle: xml.barStyle({ value: barStyle }) });
      const barline = new Barline(node);
      expect(barline.getBarStyle()).toBe(barStyle);
    });

    it(`returns 'regular' when the bar style is invalid`, () => {
      const node = xml.barline({ barStyle: xml.barStyle({ value: 'foo' }) });
      const barline = new Barline(node);
      expect(barline.getBarStyle()).toBe('regular');
    });

    it(`returns 'regular' when the bar style is missing`, () => {
      const node = xml.barline();
      const barline = new Barline(node);
      expect(barline.getBarStyle()).toBe('regular');
    });
  });
});
