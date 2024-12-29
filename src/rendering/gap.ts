import * as elements from '@/elements';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';

export class Gap {
  constructor(private config: Config, private log: Logger, private document: Document) {}

  render(): elements.Gap {
    return new elements.Gap();
  }
}
