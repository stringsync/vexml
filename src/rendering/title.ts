import * as drawing from '@/drawing';
import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';

export class Title {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  getText(): drawing.Text {
    return new drawing.Text({
      content: this.getContent(),
      x: 0,
      y: 0,
    });
  }

  private getContent(): string {
    return this.document.getScore().title;
  }
}
