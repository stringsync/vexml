import { Config } from './config';
import { Logger } from '@/debug';
import { Document } from './document';
import { MeasureKey } from './types';

export class Measure {
  constructor(
    private config: Config,
    private log: Logger,
    private document: Document,
    private measureKey: MeasureKey
  ) {}
}
