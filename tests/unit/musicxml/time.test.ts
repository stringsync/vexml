import { Time } from '@/musicxml/time';
import { xml } from '@/util';
import { TIME_SYMBOLS } from '@/musicxml';

describe(Time, () => {
  describe('getStaveNumber', () => {
    it('returns the stave number of the time', () => {
      const node = xml.time({ staveNumber: 42 });
      const time = new Time(node);
      expect(time.getStaveNumber()).toBe(42);
    });

    it('defaults to 1 when missing', () => {
      const node = xml.time();
      const time = new Time(node);
      expect(time.getStaveNumber()).toBe(1);
    });
  });

  describe('getBeats', () => {
    it('returns the beats of the time', () => {
      const node = xml.time({
        times: [{ beats: xml.beats({ value: '3' }) }],
      });
      const time = new Time(node);
      expect(time.getBeats()).toStrictEqual(['3']);
    });

    it('returns an empty array when beats is missing', () => {
      const node = xml.time();
      const time = new Time(node);
      expect(time.getBeats()).toStrictEqual([]);
    });
  });

  describe('getBeatTypes', () => {
    it('returns the beat types of the time', () => {
      const node = xml.time({
        times: [{ beatType: xml.beatType({ value: '3' }) }],
      });
      const time = new Time(node);
      expect(time.getBeatTypes()).toStrictEqual(['3']);
    });

    it('returns an empty array when beat types is missing', () => {
      const node = xml.time();
      const time = new Time(node);
      expect(time.getBeatTypes()).toStrictEqual([]);
    });
  });

  describe('isHidden', () => {
    it('returns true when there is a <senza-misura>', () => {
      const node = xml.time({ senzaMisura: xml.senzaMisura() });
      const time = new Time(node);
      expect(time.isHidden()).toBeTrue();
    });

    it('returns false when there is not a <senza-misura>', () => {
      const node = xml.time();
      const time = new Time(node);
      expect(time.isHidden()).toBeFalse();
    });
  });

  describe('getSymbol', () => {
    it.each(TIME_SYMBOLS.values)('returns the symbol of the time: %s', (symbol) => {
      const node = xml.time({ symbol });
      const time = new Time(node);
      expect(time.getSymbol()).toBe(symbol);
    });

    it('defaults to null when missing', () => {
      const node = xml.time();
      const time = new Time(node);
      expect(time.getSymbol()).toBeNull();
    });

    it('defaults to null when invalid', () => {
      const node = xml.time({ symbol: 'foo' });
      const time = new Time(node);
      expect(time.getSymbol()).toBeNull();
    });
  });
});
