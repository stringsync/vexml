import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureKey } from './types';
import { Fragment } from './fragment';
import { Gap } from './gap';

export class Measure {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private measureKey: MeasureKey
  ) {}

  getEntries(): Array<Fragment | Gap> {
    return this.document.getMeasureEntryKeys(this.measureKey).map((measureEntryKey) => {
      const measureEntry = this.document.getMeasureEntry(measureEntryKey);
      switch (measureEntry.type) {
        case 'fragment':
          return new Fragment(this.config, this.log, this.document, measureEntryKey);
        case 'gap':
          return new Gap(this.config, this.log, this.document, measureEntryKey);
      }
    });
  }
}
