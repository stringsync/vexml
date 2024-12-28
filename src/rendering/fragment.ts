import * as elements from '@/elements';
import * as data from '@/data';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';

export class Fragment {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private data: { fragment: data.Fragment }
  ) {}

  render(): elements.Fragment {
    return new elements.Fragment();
  }
}
