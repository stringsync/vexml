import { Measure } from './measure';
import { Score } from './score';
import * as xml from './xml';

describe(Score, () => {
  describe('getPartCount', () => {
    it('returns the number of <score-part> elements in the document', () => {
      const scorePartwise = xml.scorePartwise({
        partList: xml.partList({
          scoreParts: [xml.scorePart(), xml.scorePart()],
        }),
      });

      const score = new Score(scorePartwise);

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

      const score = new Score(scorePartwise);

      expect(score.getPartIds()).toStrictEqual(['foo', 'bar']);
    });

    it('ignores missing ids', () => {
      const scorePartwise = xml.scorePartwise({
        partList: xml.partList({
          scoreParts: [xml.scorePart({ id: 'foo' }), xml.scorePart()],
        }),
      });

      const score = new Score(scorePartwise);

      expect(score.getPartIds()).toStrictEqual(['foo']);
    });
  });

  describe('getPartNames', () => {
    it('returns the part names in the document', () => {
      const scorePartwise = xml.scorePartwise({
        partList: xml.partList({
          scoreParts: [
            xml.scorePart({
              partName: xml.partName({ partName: 'foo' }),
            }),
            xml.scorePart({
              partName: xml.partName({ partName: 'bar' }),
            }),
          ],
        }),
      });

      const score = new Score(scorePartwise);

      expect(score.getPartNames()).toStrictEqual(['foo', 'bar']);
    });
  });

  describe('getMeasures', () => {
    it('returns the measures in the document', () => {
      const measure1 = xml.measure();
      const measure2 = xml.measure();
      const scorePartwise = xml.scorePartwise({
        parts: [xml.part({ measures: [measure1, measure2] })],
      });

      const score = new Score(scorePartwise);

      expect(score.getMeasures()).toStrictEqual([new Measure(measure1), new Measure(measure2)]);
    });
  });
});
