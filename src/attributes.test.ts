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
});
