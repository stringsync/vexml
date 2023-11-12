import { PEDAL_TYPES, Pedal } from '@/musicxml';
import { xml } from '@/util';

describe(Pedal, () => {
  describe('getType', () => {
    it.each(PEDAL_TYPES.values)(`returns the type of the pedal: '%s'`, (type) => {
      const node = xml.pedal({ type });
      const pedal = new Pedal(node);
      expect(pedal.getType()).toBe(type);
    });

    it(`defaults to 'start' when missing`, () => {
      const node = xml.pedal();
      const pedal = new Pedal(node);
      expect(pedal.getType()).toBe('start');
    });

    it(`defaults to 'start' when invalid`, () => {
      const node = xml.pedal({ type: 'foo' });
      const pedal = new Pedal(node);
      expect(pedal.getType()).toBe('start');
    });
  });
});
