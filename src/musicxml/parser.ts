import * as data from '@/data';
import { MusicXML } from './musicxml';
import { ScorePartwise } from './scorepartwise';

/** Parses a MusicXML document string. */
export class Parser {
  parse(musicXML: string): data.Document {
    const xml = new DOMParser().parseFromString(musicXML, 'application/xml');
    const scorePartwise = new MusicXML(xml).getScorePartwise();
    const score = this.getScore(scorePartwise);
    return new data.Document(score);
  }

  private getScore(scorePartwise: ScorePartwise): data.Score {
    return {
      title: this.getTitle(scorePartwise),
      measures: this.getMeasures(),
    };
  }

  private getTitle(scorePartwise: ScorePartwise): string {
    return scorePartwise.getTitle();
  }

  private getMeasures(): data.Measure[] {
    return [];
  }
}
