import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { Measure } from './measure';
import { SystemKey } from './types';

export class System {
  constructor(private config: Config, private log: Logger, private document: Document, private systemKey: SystemKey) {}

  getMeasures(): Measure[] {
    return this.document
      .getMeasureKeys(this.systemKey)
      .map((measureKey) => new Measure(this.config, this.log, this.document, measureKey));
  }
}
