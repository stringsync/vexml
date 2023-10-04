import { xml } from '@/util';
import { Forward } from '@/musicxml';

describe('forward', () => {
  describe('getDuration', () => {
    it('returns the number of divisions to forward when processing notes', () => {
      const node = xml.forward({ duration: xml.duration({ positiveDivisions: 2 }) });
      const forward = new Forward(node);
      expect(forward.getDuration()).toBe(2);
    });

    it('defaults to 4 when not specified', () => {
      const node = xml.forward();
      const forward = new Forward(node);
      expect(forward.getDuration()).toBe(4);
    });
  });
});
