import { Measure } from '@/measure';
import { Part } from '@/part';
import * as xml from '@/xml';

describe(Part, () => {
  describe('getId', () => {
    it('returns the ID of the part', () => {
      const node = xml.part({ id: 'foo' });
      const part = new Part(node);
      expect(part.getId()).toBe('foo');
    });
  });

  describe('getMeasures', () => {
    it('returns the measures of the part', () => {
      const measure1 = xml.measure();
      const measure2 = xml.measure();
      const node = xml.part({ measures: [measure1, measure2] });

      const part = new Part(node);

      expect(part.getMeasures()).toStrictEqual([new Measure(measure1), new Measure(measure2)]);
    });
  });
});
