import * as elements from '@/elements';
import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';
import { System } from './system';

export class Score {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  render(): elements.Score {
    const systems = this.renderSystems();
    return new elements.Score(systems);
  }

  private renderSystems(): elements.System[] {
    return this.document
      .getSystems()
      .map((system) => new System(this.config, this.log, this.document, { system }))
      .map((system) => system.render());
  }
}
