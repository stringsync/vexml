import * as elements from '@/elements';
import { Logger } from '@/debug';
import { LegacySequence } from './legacysequence';

export class SequenceFactory {
  constructor(private log: Logger, private score: elements.Score) {}

  create(): LegacySequence[] {
    // TODO: Use real impl.
    return Array.from({ length: this.score.getPartCount() }, (_, i) => new LegacySequence(i, []));
  }
}
