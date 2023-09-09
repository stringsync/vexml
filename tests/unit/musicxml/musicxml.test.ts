import { MusicXml } from '@/musicxml/musicxml';
import { NamedElement } from '@/util/namedelement';
import { ScorePartwise } from '@/musicxml/scorepartwise';
import * as xml from '@/util/xml';

describe(MusicXml, () => {
  describe('getScorePartwise', () => {
    it('returns the score of the musicxml document', () => {
      const root = xml.createDocument();
      const scorePartwise = NamedElement.of<'score-partwise'>(root.createElement('score-partwise'));
      root.appendChild(scorePartwise.native());

      const musicXml = new MusicXml(root);

      expect(musicXml.getScorePartwise()).toStrictEqual(new ScorePartwise(scorePartwise));
    });

    it('returns null when <score-partwise> is missing', () => {
      const root = xml.createDocument();
      const musicXml = new MusicXml(root);
      expect(musicXml.getScorePartwise()).toBeNull();
    });
  });
});
