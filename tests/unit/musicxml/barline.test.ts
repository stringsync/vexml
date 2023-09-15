import { Barline } from '@/musicxml/barline';
import { BAR_STYLES } from '@/musicxml/enums';
import { xml } from '@/util';

describe(Barline, () => {
  describe('getBarStyle', () => {
    it.each(BAR_STYLES.values)(`returns the bar style of the barline: '%s'`, (barStyle) => {
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

  describe('isEnding', () => {
    it('returns true when the barline has an ending', () => {
      const node = xml.barline({ ending: xml.ending() });
      const barline = new Barline(node);
      expect(barline.isEnding()).toBeTrue();
    });

    it('returns false when the barline does not have an ending', () => {
      const node = xml.barline();
      const barline = new Barline(node);
      expect(barline.isEnding()).toBeFalse();
    });
  });

  describe('getEndingText', () => {
    it('returns the ending text of the barline', () => {
      const node = xml.barline({ ending: xml.ending({ textContent: 'foo' }) });
      const barline = new Barline(node);
      expect(barline.getEndingText()).toBe('foo');
    });

    it('defaults to an empty string when the barline does not have an ending', () => {
      const node = xml.barline();
      const barline = new Barline(node);
      expect(barline.getEndingText()).toBe('');
    });
  });

  describe('getEndingNumber', () => {
    it('returns the ending number of the barline', () => {
      const node = xml.barline({ ending: xml.ending({ number: '2' }) });
      const barline = new Barline(node);
      expect(barline.getEndingNumber()).toBe('2');
    });

    it(`defaults to '1' when the ending number is missing`, () => {
      const node = xml.barline();
      const barline = new Barline(node);
      expect(barline.getEndingNumber()).toBe('1');
    });
  });

  describe('getEndingType', () => {
    it.each(['start', 'stop', 'discontinue'])(`returns the ending type of the barline: '%s'`, (endingType) => {
      const node = xml.barline({ ending: xml.ending({ type: endingType }) });
      const barline = new Barline(node);
      expect(barline.getEndingType()).toBe(endingType);
    });

    it(`defaults to 'start' when the barline does not have an ending type`, () => {
      const node = xml.barline();
      const barline = new Barline(node);
      expect(barline.getEndingType()).toBe('start');
    });
  });
});
