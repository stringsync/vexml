import { MusicXml } from '@/musicxml/musicxml';
import { ScorePartwise } from '@/musicxml/scorepartwise';
import { xml } from '@/util';

describe(MusicXml, () => {
  describe('getScorePartwise', () => {
    it('returns the score of the musicxml document', () => {
      const scorePartwise = xml.scorePartwise();
      const document = xml.musicXML(scorePartwise);

      const musicXML = new MusicXml(document);

      expect(musicXML.getScorePartwise()).toStrictEqual(new ScorePartwise(scorePartwise));
    });

    it('throws when <score-partwise> is missing', () => {
      const root = xml.createDocument();
      const musicXML = new MusicXml(root);
      expect(() => musicXML.getScorePartwise()).toThrow();
    });
  });
});
