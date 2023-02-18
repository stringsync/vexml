import { Attributes } from './attributes';
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

  describe('getBeats', () => {
    it('returns the beats', () => {
      const node = xml.attributes({
        times: [
          xml.time({
            times: [
              {
                beats: xml.beats({ textContent: '3' }),
                beatType: xml.beatType({ textContent: '8' }),
              },
            ],
          }),
        ],
      });
      const attributes = new Attributes(node);
      expect(attributes.getBeats()).toBe('3');
    });

    it('returns 4 when beats is missing', () => {
      const node = xml.attributes();
      const attributes = new Attributes(node);
      expect(attributes.getBeats()).toBe('4');
    });
  });

  describe('getBeatType', () => {
    it('returns the beat type', () => {
      const node = xml.attributes({
        times: [
          xml.time({
            times: [
              {
                beats: xml.beats({ textContent: '3' }),
                beatType: xml.beatType({ textContent: '8' }),
              },
            ],
          }),
        ],
      });
      const attributes = new Attributes(node);
      expect(attributes.getBeatType()).toBe('8');
    });

    it('returns 4 when beat type is missing', () => {
      const node = xml.attributes();
      const attributes = new Attributes(node);
      expect(attributes.getBeatType()).toBe('4');
    });
  });
});
