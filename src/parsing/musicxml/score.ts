import * as data from '@/data';
import * as musicxml from '@/musicxml';
import { System } from './system';
import { IdProvider } from './idprovider';
import { ScoreContext } from './contexts';

export class Score {
  private idProvider = new IdProvider();

  constructor(private musicXML: { scorePartwise: musicxml.ScorePartwise }) {}

  parse(): data.Score {
    const scoreCtx = new ScoreContext(this.idProvider);

    return {
      type: 'score',
      title: this.getTitle(),
      partLabels: this.getPartLabels(),
      systems: this.getSystems().map((system) => system.parse(scoreCtx)),
      curves: scoreCtx.getCurves(),
    };
  }

  private getTitle(): string {
    return this.musicXML.scorePartwise.getTitle();
  }

  private getPartLabels(): string[] {
    return this.musicXML.scorePartwise.getPartDetails().map((p) => p.name);
  }

  private getSystems(): System[] {
    // When parsing, we'll assume that there is only one system. Pre-rendering determines the minimum needed widths for
    // each element. We can then use this information to determine the number of systems needed to fit a constrained
    // width if needed.
    const system = new System(this.idProvider, { scorePartwise: this.musicXML.scorePartwise });
    return [system];
  }
}
