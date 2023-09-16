import { MusicXml } from '@/musicxml/musicxml';
import { ScorePartwise } from '@/musicxml/scorepartwise';
import { xml } from '@/util';

describe(MusicXml, () => {
  describe('getScorePartwise', () => {
    it('returns the score of the musicxml document', () => {
      const scorePartwise = xml.scorePartwise();
      const document = xml.musicXml(scorePartwise);

      const musicXml = new MusicXml(document);

      expect(musicXml.getScorePartwise()).toStrictEqual(new ScorePartwise(scorePartwise));
    });

    it('returns null when <score-partwise> is missing', () => {
      const root = xml.createDocument();
      const musicXml = new MusicXml(root);
      expect(musicXml.getScorePartwise()).toBeNull();
    });
  });
});
