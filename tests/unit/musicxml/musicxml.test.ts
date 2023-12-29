import { MusicXML } from '@/musicxml/musicxml';
import { ScorePartwise } from '@/musicxml/scorepartwise';
import { xml } from '@/util';

describe(MusicXML, () => {
  describe('getScorePartwise', () => {
    it('returns the score of the musicxml document', () => {
      const scorePartwise = xml.scorePartwise();
      const document = xml.musicXML(scorePartwise);

      const musicXML = new MusicXML(document);

      expect(musicXML.getScorePartwise()).toStrictEqual(new ScorePartwise(scorePartwise));
    });

    it('throws when <score-partwise> is missing', () => {
      const root = xml.createDocument();
      const musicXML = new MusicXML(root);
      expect(() => musicXML.getScorePartwise()).toThrow();
    });
  });
});
