import { OctaveShift, UP_DOWN_STOP_CONTINUE } from '@/musicxml';
import { xml } from '@/util';

describe(OctaveShift, () => {
  describe('getType', () => {
    it.each(UP_DOWN_STOP_CONTINUE.values)(`returns the type of the octave shift: '%s'`, (type) => {
      const node = xml.octaveShift({ type });
      const octaveShift = new OctaveShift(node);
      expect(octaveShift.getType()).toBe(type);
    });

    it(`defaults to 'up' when not supplied`, () => {
      const node = xml.octaveShift();
      const octaveShift = new OctaveShift(node);
      expect(octaveShift.getType()).toBe('up');
    });

    it(`defaults to 'up' when invalid`, () => {
      const node = xml.octaveShift({ type: 'foo' });
      const octaveShift = new OctaveShift(node);
      expect(octaveShift.getType()).toBe('up');
    });
  });

  describe('getSize', () => {
    it('returns the size of the octave shift', () => {
      const node = xml.octaveShift({ size: 16 });
      const octaveShift = new OctaveShift(node);
      expect(octaveShift.getSize()).toBe(16);
    });

    it('defaults to 8 when not supplied', () => {
      const node = xml.octaveShift();
      const octaveShift = new OctaveShift(node);
      expect(octaveShift.getSize()).toBe(8);
    });

    it('defaults to 8 when invalid', () => {
      const node = xml.octaveShift({ size: NaN });
      const octaveShift = new OctaveShift(node);
      expect(octaveShift.getSize()).toBe(8);
    });
  });
});
