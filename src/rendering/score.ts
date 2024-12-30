import * as elements from '@/elements';
import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';
import { System } from './system';
import { Title } from './title';

export class Score {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  getTitle(): Title | null {
    if (this.document.getTitle()) {
      return new Title(this.config, this.log, this.document);
    } else {
      return null;
    }
  }

  getSystems(): System[] {
    return this.document
      .getSystems()
      .map((_, systemIndex) => new System(this.config, this.log, this.document, { systemIndex }));
  }

  render(): elements.Score {
    const x = 0;
    let y = this.config.TOP_PADDING;

    const title = this.getTitle();
    let titleElement: elements.Title | null = null;
    if (title) {
      titleElement = title.render(x, y);
      y += titleElement.getRect().h;
      y += this.config.TITLE_BOTTOM_PADDING;
    }

    const systemElements = new Array<elements.System>();

    for (const system of this.getSystems()) {
      const systemElement = system.render(y);
      systemElements.push(systemElement);
      y += systemElement.getRect().h;
    }

    // TODO: Provide part labels.
    return new elements.Score(titleElement, [], systemElements);
  }
}
