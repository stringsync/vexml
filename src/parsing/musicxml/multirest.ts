import { Config } from '@/config';
import { Logger } from '@/debug';

export class MultiRest {
  constructor(private config: Config, private log: Logger, private measureCount: number) {}

  getMeasureCount(): number {
    return this.measureCount;
  }
}
