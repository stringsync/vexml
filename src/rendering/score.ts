import * as elements from '@/elements';
import { Document } from './document';
import { Config } from './config';
import { Logger } from '@/debug';

export class Score {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  render(): elements.Score {
    throw new Error('Not implemented');
  }
}
