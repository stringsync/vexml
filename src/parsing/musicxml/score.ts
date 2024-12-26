import * as musicxml from '@/musicxml';
import { System } from './system';

export class Score {
  constructor(private musicXML: { scorePartwise: musicxml.ScorePartwise }) {}

  getTitle(): string {
    return this.musicXML.scorePartwise.getTitle();
  }

  getSystems(): System[] {
    // When parsing, we'll assume that there is only one system. Pre-rendering determines the minimum needed widths for
    // each element. We can then use this information to determine the number of systems needed to fit a constrained
    // width if needed.
    const system = new System({ scorePartwise: this.musicXML.scorePartwise });
    return [system];
  }
}
