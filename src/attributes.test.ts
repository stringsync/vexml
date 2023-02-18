import { Attributes } from './attributes';
import { Time } from './time';
import * as xml from './xml';

describe(Attributes, () => {
  describe('getStaveCount', () => {
    it('returns the number of staves', () => {
      const node = xml.attributes({ staves: xml.staves({ staveCount: 4 }) });
      const attributes = new Attributes(node);
      expect(attributes.getStaveCount()).toBe(4);
    });

    it('returns 0 when there is no staves element', () => {
      const node = xml.attributes();
      const attributes = new Attributes(node);
      expect(attributes.getStaveCount()).toBe(0);
    });

    it('returns 0 when the staves element is empty', () => {
      const node = xml.attributes({ staves: xml.staves() });
      const attributes = new Attributes(node);
      expect(attributes.getStaveCount()).toBe(0);
    });

    it('returns 0 when the staves text content is invalid', () => {
      const node = xml.attributes({ staves: xml.staves({ staveCount: NaN }) });
      const attributes = new Attributes(node);
      expect(attributes.getStaveCount()).toBe(0);
    });
  });

  describe('getTimes', () => {
    it('returns the times', () => {
      const time = xml.time({
        times: [{ beats: xml.beats({ textContent: '3' }), beatType: xml.beatType({ textContent: '8' }) }],
      });
      const node = xml.attributes({ times: [time] });
      const attributes = new Attributes(node);
      expect(attributes.getTimes()).toStrictEqual([new Time(time)]);
    });

    it('returns an empty array when time is missing', () => {
      const node = xml.attributes();
      const attributes = new Attributes(node);
      expect(attributes.getTimes()).toBeEmpty();
    });
  });
});
