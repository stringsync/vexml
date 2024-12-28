import * as data from '@/data';

/** A wrapper around {@link data.Document} that provides querying capabilities. */
export class Document {
  constructor(private data: data.Document) {}

  getScore(): data.Score {
    return this.data.score;
  }

  getSystems(): data.System[] {
    return this.getScore().systems;
  }
}
