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

  describe('getPartNames', () => {
    it('returns the part names in the document', () => {
      const scorePartwise = xml.scorePartwise({
        partList: xml.partList({
          scoreParts: [
            xml.scorePart({
              partName: xml.partName({ textContent: 'foo' }),
            }),
            xml.scorePart({
              partName: xml.partName({ textContent: 'bar' }),
            }),
          ],
        }),
      });

      const score = new ScorePartwise(scorePartwise);

      expect(score.getPartNames()).toStrictEqual(['foo', 'bar']);
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
