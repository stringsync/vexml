import * as elements from '@/elements';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey } from './types';

export class Fragment {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private fragmentKey: MeasureEntryKey
  ) {}

  render(): elements.Fragment {
    return new elements.Fragment();
  }
}
