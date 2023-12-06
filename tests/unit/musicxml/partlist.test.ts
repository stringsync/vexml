import { PartList } from '@/musicxml';
import { xml } from '@/util';

describe(PartList, () => {
  describe('getPartDetails', () => {
    it('returns the details of the parts within the score', () => {
      const node = xml.partList({
        scoreParts: [
          xml.scorePart({ id: 'P0', partName: xml.partName({ textContent: 'foo' }) }),
          xml.scorePart({ id: 'P1', partName: xml.partName({ textContent: 'bar' }) }),
        ],
      });

      const partList = new PartList(node);

      expect(partList.getPartDetails()).toStrictEqual([
        { id: 'P0', name: 'foo' },
        { id: 'P1', name: 'bar' },
      ]);
    });

    it('defaults to an empty array when missing', () => {
      const node = xml.partList();
      const partList = new PartList(node);
      expect(partList.getPartDetails()).toBeEmpty();
    });

    it('defaults id to an empty string when missing', () => {
      const node = xml.partList({
        scoreParts: [
          xml.scorePart({ partName: xml.partName({ textContent: 'foo' }) }),
          xml.scorePart({ partName: xml.partName({ textContent: 'bar' }) }),
        ],
      });

      const partList = new PartList(node);

      expect(partList.getPartDetails()).toStrictEqual([
        { id: '', name: 'foo' },
        { id: '', name: 'bar' },
      ]);
    });

    it('defaults name to an empty string when missing', () => {
      const node = xml.partList({
        scoreParts: [xml.scorePart({ id: 'P0' }), xml.scorePart({ id: 'P1' })],
      });

      const partList = new PartList(node);

      expect(partList.getPartDetails()).toStrictEqual([
        { id: 'P0', name: '' },
        { id: 'P1', name: '' },
      ]);
    });
  });
});
