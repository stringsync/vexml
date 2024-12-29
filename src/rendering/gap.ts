import * as elements from '@/elements';
import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureEntryKey } from './types';

export class Gap {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private gapKey: MeasureEntryKey
  ) {}

  render(): elements.Gap {
    return new elements.Gap();
  }
}
