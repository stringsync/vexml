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

  describe('isRepeat', () => {
    it('returns true when a repeat is present', () => {
      const node = xml.barline({ repeat: xml.repeat() });
      const barline = new Barline(node);
      expect(barline.isRepeat()).toBeTrue();
    });

    it('returns false when a repeat is absent', () => {
      const node = xml.barline();
      const barline = new Barline(node);
      expect(barline.isRepeat()).toBeFalse();
    });
  });

  describe('getRepeatDirection', () => {
    it.each(['backward', 'forward'])(`returns the repeat direction of the barline: '%s'`, (direction) => {
      const node = xml.barline({ repeat: xml.repeat({ direction }) });
      const barline = new Barline(node);
      expect(barline.getRepeatDirection()).toBe(direction);
    });

    it('defaults to null when the repeat direction is invalid', () => {
      const node = xml.barline({ repeat: xml.repeat({ direction: 'foo' }) });
      const barline = new Barline(node);
      expect(barline.getRepeatDirection()).toBeNull();
    });

    it('defaults to null when the repeat direction is absent', () => {
      const node = xml.barline();
      const barline = new Barline(node);
      expect(barline.getRepeatDirection()).toBeNull();
    });
  });

  describe('getLocation', () => {
    it.each(['right', 'left', 'middle'])(`returns the location of the barline: '%s'`, (location) => {
      const node = xml.barline({ location });
      const barline = new Barline(node);
      expect(barline.getLocation()).toBe(location);
    });

    it(`defaults to 'right' when the location is invalid`, () => {
      const node = xml.barline({ location: 'foo' });
      const barline = new Barline(node);
      expect(barline.getLocation()).toBe('right');
    });

    it(`defaults to 'right' when the location is missing`, () => {
      const node = xml.barline();
      const barline = new Barline(node);
      expect(barline.getLocation()).toBe('right');
    });
  });
});
