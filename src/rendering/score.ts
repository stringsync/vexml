import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';
import { System } from './system';
import { Title } from './title';

export class Score {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  getTitle(): Title {
    return new Title(this.config, this.log, this.document);
  }

  getSystems(): System[] {
    return this.document
      .getSystemKeys()
      .map((systemKey) => new System(this.config, this.log, this.document, systemKey));
  }
}
