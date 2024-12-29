import * as data from '@/data';

/** A wrapper around {@link data.Document} that provides querying capabilities. */
export class Document {
  constructor(private data: data.Document) {}

  getTitle(): data.Title | null {
    return this.data.score.title;
  }

  getScore(): data.Score {
    return this.data.score;
  }

  getSystems(): data.System[] {
    return this.data.score.systems;
  }

  getMeasures(): data.Measure[] {
    return this.getSystems().flatMap((system) => system.measures);
  }
}
