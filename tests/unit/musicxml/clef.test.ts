import { Clef } from '@/musicxml/clef';
import { xml } from '@/util';

describe(Clef, () => {
  describe('getStaveNumber', () => {
    it('returns the stave number', () => {
      const node = xml.clef({ number: 2 });
      const clef = new Clef(node);
      expect(clef.getStaveNumber()).toBe(2);
    });

    it(`defaults to '1' when invalid stave number`, () => {
      const node = xml.clef({ number: NaN });
      const clef = new Clef(node);
      expect(clef.getStaveNumber()).toBe(1);
    });

    it(`defaults to '1' when stave number missing`, () => {
      const node = xml.clef({});
      const clef = new Clef(node);
      expect(clef.getStaveNumber()).toBe(1);
    });
  });

  describe('getSign', () => {
    it.each(['G', 'F', 'C', 'percussion', 'TAB', 'jianpu', 'none'])(`returns the sign of the clef: '%s'`, (sign) => {
      const node = xml.clef({ sign: xml.sign({ value: sign }) });
      const clef = new Clef(node);
      expect(clef.getSign()).toBe(sign);
    });

    it(`defaults to null when the clef sign is invalid`, () => {
      const node = xml.clef({ sign: xml.sign({ value: 'foo' }) });
      const clef = new Clef(node);
      expect(clef.getSign()).toBeNull();
    });

    it(`defaults to null when the clef sign is missing`, () => {
      const node = xml.clef();
      const clef = new Clef(node);
      expect(clef.getSign()).toBeNull();
    });
  });

  describe('getLine', () => {
    it('returns the line of the clef', () => {
      const node = xml.clef({ line: xml.line({ value: 4 }) });
      const clef = new Clef(node);
      expect(clef.getLine()).toBe(4);
    });

    it('defaults the line of the clef to null when missing', () => {
      const node = xml.clef();
      const clef = new Clef(node);
      expect(clef.getLine()).toBeNull();
    });
  });

  describe('getOctaveChange', () => {
    it('returns the octave change of the clef', () => {
      const node = xml.clef({ clefOctaveChange: xml.clefOctaveChange({ value: 4 }) });
      const clef = new Clef(node);
      expect(clef.getOctaveChange()).toBe(4);
    });

    it('defaults the octave change of the clef to null when missing', () => {
      const node = xml.clef();
      const clef = new Clef(node);
      expect(clef.getOctaveChange()).toBeNull();
    });
  });
});
