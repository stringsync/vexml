import { Clef } from './clef';
import * as xml from './xml';

describe(Clef, () => {
  describe('getSign', () => {
    it.each(['G', 'F', 'C'])(`returns the sign of the clef: '%s'`, (sign) => {
      const node = xml.clef({ sign: xml.sign({ value: sign }) });
      const clef = new Clef(node);
      expect(clef.getSign()).toBe(sign);
    });

    it(`defaults to 'G' when the clef sign is invalid`, () => {
      const node = xml.clef({ sign: xml.sign({ value: 'foo' }) });
      const clef = new Clef(node);
      expect(clef.getSign()).toBe('G');
    });

    it(`defaults to 'G' when the clef sign is missing`, () => {
      const node = xml.clef();
      const clef = new Clef(node);
      expect(clef.getSign()).toBe('G');
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
