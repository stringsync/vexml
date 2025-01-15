import { Config } from '@/config';
import { Logger } from '@/debug';

export class StaveCount {
  constructor(private config: Config, private log: Logger, private partId: string, private value: number) {}

  static default(config: Config, log: Logger, partId: string): StaveCount {
    return new StaveCount(config, log, partId, 1);
  }

  getPartId(): string {
    return this.partId;
  }

  getValue(): number {
    return this.value;
  }

  isEqual(staveCount: StaveCount): boolean {
    return this.partId === staveCount.partId && this.isEquivalent(staveCount);
  }

  isEquivalent(staveCount: StaveCount): boolean {
    return this.value === staveCount.value;
  }
}
