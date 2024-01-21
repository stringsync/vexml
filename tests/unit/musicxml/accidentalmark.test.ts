import { ACCIDENTAL_TYPES, AccidentalMark } from '@/musicxml';
import { xml } from '@/util';

describe(AccidentalMark, () => {
  describe('getType', () => {
    it.each(ACCIDENTAL_TYPES.values)(`returns the type: '%s'`, (type) => {
      const node = xml.accidentalMark({ type });
      const accidentalMark = new AccidentalMark(node);
      expect(accidentalMark.getType()).toBe(type);
    });

    it(`defaults to null when the type is missing`, () => {
      const node = xml.accidentalMark();
      const accidentalMark = new AccidentalMark(node);
      expect(accidentalMark.getType()).toBeNull();
    });

    it(`defaults to null when the type is invalid`, () => {
      const node = xml.accidentalMark({ type: 'foo' });
      const accidentalMark = new AccidentalMark(node);
      expect(accidentalMark.getType()).toBeNull();
    });
  });
});
