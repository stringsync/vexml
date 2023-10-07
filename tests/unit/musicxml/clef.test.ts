import { Clef } from '@/musicxml/clef';
import { xml } from '@/util';

describe(Clef, () => {
  describe('getStaffNumber', () => {
    it('returns the staff number', () => {
      const node = xml.clef({ number: 2 });
      const clef = new Clef(node);
      expect(clef.getStaveNumber()).toBe(2);
    });

    it(`defaults to '1' when invalid staff number`, () => {
      const node = xml.clef({ number: NaN });
      const clef = new Clef(node);
      expect(clef.getStaveNumber()).toBe(1);
    });

    it(`defaults to '1' when staff number missing`, () => {
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

  describe('getClefType', () => {
    it.each([
      { sign: 'G', line: 1, clefType: 'french' },
      { sign: 'G', line: undefined, clefType: 'treble' },
      { sign: 'F', line: 5, clefType: 'subbass' },
      { sign: 'F', line: 3, clefType: 'baritone-f' },
      { sign: 'F', line: undefined, clefType: 'bass' },
      { sign: 'C', line: 5, clefType: 'baritone-c' },
      { sign: 'C', line: 4, clefType: 'tenor' },
      { sign: 'C', line: 2, clefType: 'mezzo-soprano' },
      { sign: 'C', line: 1, clefType: 'soprano' },
      { sign: 'C', line: undefined, clefType: 'alto' },
      { sign: 'percussion', line: undefined, clefType: 'percussion' },
      { sign: 'TAB', line: undefined, clefType: 'treble' },
      { sign: 'foo', line: 1, clefType: null },
    ])(`returns the clef type for sign '$sign' and line $line`, (t) => {
      const node = xml.clef({ sign: xml.sign({ value: t.sign }), line: xml.line({ value: t.line }) });
      const clef = new Clef(node);
      expect(clef.getClefType()).toBe(t.clefType);
    });

    it('defaults to null when the clef sign is invalid', () => {
      const node = xml.clef({ sign: xml.sign({ value: 'foo' }) });
      const clef = new Clef(node);
      expect(clef.getClefType()).toBeNull();
    });
  });

  describe('getAnnotation', () => {
    it.each([
      { octaveChange: 1, annotation: '8va' },
      { octaveChange: -1, annotation: '8vb' },
    ])('returns the annotation of the clef: octaveChange $octaveChange', (t) => {
      const node = xml.clef({ clefOctaveChange: xml.clefOctaveChange({ value: t.octaveChange }) });
      const clef = new Clef(node);
      expect(clef.getAnnotation()).toBe(t.annotation);
    });

    it('returns null when the octave change is invalid', () => {
      const node = xml.clef({ clefOctaveChange: xml.clefOctaveChange({ value: NaN }) });
      const clef = new Clef(node);
      expect(clef.getAnnotation()).toBeNull();
    });

    it('returns null when the octave change is missing', () => {
      const node = xml.clef();
      const clef = new Clef(node);
      expect(clef.getAnnotation()).toBeNull();
    });
  });
});
