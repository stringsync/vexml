import * as spatial from '@/spatial';
import * as elements from '@/elements';
import * as vexflow from 'vexflow';
import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';
import { System } from './system';
import { Title } from './title';

export class Score {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  hasTitle(): boolean {
    return this.document.getScore().title.length > 0;
  }

  getTitle(): Title {
    return new Title(this.config, this.log, this.document);
  }

  getSystems(): System[] {
    return this.document
      .getSystemKeys()
      .map((systemKey) => new System(this.config, this.log, this.document, systemKey));
  }

  render(ctx: vexflow.RenderContext): elements.Score {
    const title = this.getTitle().render(ctx, spatial.Point.origin());

    return new elements.Score(ctx, title, []);
  }
}
