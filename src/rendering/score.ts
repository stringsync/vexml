import * as elements from '@/elements';
import * as vexflow from 'vexflow';
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
      .getSystems()
      .map((_, systemIndex) => new System(this.config, this.log, this.document, { systemIndex }));
  }

  render(ctx: vexflow.RenderContext): elements.Score {
    const score = this.document.getScore();

    const title = this.getTitle().render(ctx);
    const systems = this.getSystems().map((system) => system.render(ctx));

    return new elements.Score(ctx, title, [], systems);
  }
}
