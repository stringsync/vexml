import { Part } from '@/musicxml/part';
import { ScorePartwise } from '@/musicxml/scorepartwise';
import { xml } from '@/util';
import { Defaults } from '@/musicxml';

describe(ScorePartwise, () => {
  describe('getPartCount', () => {
    it('returns the number of <score-part> elements in the document', () => {
      const scorePartwise = xml.scorePartwise({
        partList: xml.partList({
          scoreParts: [xml.scorePart(), xml.scorePart()],
        }),
      });

      const score = new ScorePartwise(scorePartwise);

      expect(score.getPartCount()).toBe(2);
    });
  });

  describe('getPartIds', () => {
    it('returns the part IDs in the document', () => {
      const scorePartwise = xml.scorePartwise({
        partList: xml.partList({
          scoreParts: [xml.scorePart({ id: 'foo' }), xml.scorePart({ id: 'bar' })],
        }),
      });

      const score = new ScorePartwise(scorePartwise);

      expect(score.getPartIds()).toStrictEqual(['foo', 'bar']);
    });

    it('ignores missing ids', () => {
      const scorePartwise = xml.scorePartwise({
        partList: xml.partList({
          scoreParts: [xml.scorePart({ id: 'foo' }), xml.scorePart()],
        }),
      });

      const score = new ScorePartwise(scorePartwise);

      expect(score.getPartIds()).toStrictEqual(['foo']);
    });
  });

  describe('getPartDetails', () => {
    it('returns the details of the parts within the score', () => {
      const node = xml.scorePartwise({
        partList: xml.partList({
          scoreParts: [
            xml.scorePart({ id: 'P0', partName: xml.partName({ textContent: 'foo' }) }),
            xml.scorePart({ id: 'P1', partName: xml.partName({ textContent: 'bar' }) }),
          ],
        }),
      });

      const scorePartwise = new ScorePartwise(node);

      expect(scorePartwise.getPartDetails()).toStrictEqual([
        { id: 'P0', name: 'foo' },
        { id: 'P1', name: 'bar' },
      ]);
    });

    it('defaults to an empty array when missing', () => {
      const node = xml.scorePartwise();
      const partList = new ScorePartwise(node);
      expect(partList.getPartDetails()).toBeEmpty();
    });

    it('defaults id to an empty string when missing', () => {
      const node = xml.scorePartwise({
        partList: xml.partList({
          scoreParts: [
            xml.scorePart({ partName: xml.partName({ textContent: 'foo' }) }),
            xml.scorePart({ partName: xml.partName({ textContent: 'bar' }) }),
          ],
        }),
      });

      const partList = new ScorePartwise(node);

      expect(partList.getPartDetails()).toStrictEqual([
        { id: '', name: 'foo' },
        { id: '', name: 'bar' },
      ]);
    });

    it('defaults name to an empty string when missing', () => {
      const node = xml.scorePartwise({
        partList: xml.partList({
          scoreParts: [xml.scorePart({ id: 'P0' }), xml.scorePart({ id: 'P1' })],
        }),
      });

      const partList = new ScorePartwise(node);

      expect(partList.getPartDetails()).toStrictEqual([
        { id: 'P0', name: '' },
        { id: 'P1', name: '' },
      ]);
    });
  });

  describe('getMeasures', () => {
    it('returns the measures in the document', () => {
      const part1 = xml.part();
      const part2 = xml.part();
      const scorePartwise = xml.scorePartwise({
        parts: [part1, part2],
      });

      const score = new ScorePartwise(scorePartwise);

      expect(score.getParts()).toStrictEqual([new Part(part1), new Part(part2)]);
    });
  });

  describe('getDefaults', () => {
    it('returns the defaults of the score partwise', () => {
      const defaults = xml.defaults();
      const node = xml.scorePartwise({ defaults });

      const score = new ScorePartwise(node);

      expect(score.getDefaults()).toStrictEqual(new Defaults(defaults));
    });

    it('returns null when defaults is missing', () => {
      const node = xml.scorePartwise({});
      const score = new ScorePartwise(node);
      expect(score.getDefaults()).toBeNull();
    });
  });
});
