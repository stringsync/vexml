import * as elements from '@/elements';
import * as vexflow from 'vexflow';
import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';
import { System } from './system';
import { Title } from './title';
import { Format } from './types';

export class Score {
  constructor(private config: Config, private log: Logger, private document: Document, private format: Format) {}

  getTitle(): Title {
    return new Title(this.config, this.log, this.document, this.format);
  }

  getSystems(): System[] {
    return this.document
      .getSystemKeys()
      .map((systemKey) => new System(this.config, this.log, this.document, systemKey));
  }

  render(ctx: vexflow.RenderContext): elements.Score {
    const title = this.getTitle().render(ctx);

    const systems = this.getSystems();

    return new elements.Score(ctx, title, []);
  }
}
